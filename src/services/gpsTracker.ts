/**
 * gpsTracker.ts — GPS walk tracking with honest verification.
 *
 * Two changes matter most here versus a naive implementation:
 *
 * 1. NO SILENT SIMULATION. If the location permission is denied or no fix is
 *    available, the session reports an error and stops. It does not quietly
 *    switch to synthesising steps. An indoor/treadmill simulator still exists,
 *    but only when the user explicitly chooses it, and those sessions are
 *    flagged `isVerified: false` — they are recorded for the user's own
 *    reference and never award XP or secure the daily streak.
 *
 * 2. WALL-CLOCK DURATION. Elapsed time is computed from timestamps, not by
 *    counting setInterval ticks. Android throttles timers in backgrounded
 *    WebViews, so tick-counting silently under-reports every walk where the
 *    user pockets their phone — which is every real walk.
 */

import { GpsWalkSession } from '../types';
import { db, toDateKey } from './db';

export type GpsMode = 'gps' | 'simulator';

export interface GpsState {
  isActive: boolean;
  isPaused: boolean;
  mode: GpsMode;
  /** False for simulator sessions — they cannot secure the streak. */
  isVerified: boolean;
  durationSeconds: number;
  distanceMeters: number;
  stepsCount: number;
  currentPaceMinKm: number;
  currentSpeedKmh: number;
  targetSteps: number;
  targetDistanceMeters: number;
  isTargetMet: boolean;
  coordinatesCount: number;
  gpsAccuracy: number | null;
  /** Set when tracking could not start or was lost. Never hidden from the UI. */
  error: string | null;
  /** True once a first GPS fix has arrived. */
  hasFix: boolean;
}

/** Average stride: ~0.762 m per step. */
const METERS_PER_STEP = 0.762;
const STEPS_PER_METER = 1 / METERS_PER_STEP;

/** Discard fixes jitterier than this; GPS noise otherwise inflates distance. */
const MIN_SEGMENT_METERS = 2.5;
/** Discard implausible jumps (tunnel re-acquisition, tower snapping). */
const MAX_SEGMENT_METERS = 60;
/** Ignore fixes worse than this accuracy entirely. */
const MAX_ACCEPTABLE_ACCURACY_M = 35;

/** Survives a WebView eviction mid-walk. */
const ACTIVE_SESSION_KEY = 'rw_active_walk_v2';

interface PersistedWalk {
  startedAtMs: number;
  accumulatedMs: number;
  pausedAtMs: number | null;
  distanceMeters: number;
  stepsCount: number;
  targetSteps: number;
  mode: GpsMode;
  coordinates: Array<{ lat: number; lng: number; timestamp: number }>;
}

class GpsTrackerService {
  private watchId: number | null = null;
  private uiTimerId: ReturnType<typeof setInterval> | null = null;
  private simTimerId: ReturnType<typeof setInterval> | null = null;

  private startedAtMs = 0;
  /** Milliseconds accumulated across previous run segments (before pauses). */
  private accumulatedMs = 0;
  private pausedAtMs: number | null = null;

  private distanceMeters = 0;
  private stepsCount = 0;
  private lastPosition: { lat: number; lng: number; timestamp: number } | null = null;
  private coordinates: Array<{ lat: number; lng: number; timestamp: number }> = [];

  private isActive = false;
  private mode: GpsMode = 'gps';
  private targetSteps = 3000;
  private gpsAccuracy: number | null = null;
  private error: string | null = null;
  private hasFix = false;

  private listeners: Array<(state: GpsState) => void> = [];

  constructor() {
    this.restoreActiveSession();
  }

  /* ── subscription ─────────────────────────────────────────────────────── */

  public subscribe(listener: (state: GpsState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    for (const l of this.listeners) l(state);
  }

  /* ── state ────────────────────────────────────────────────────────────── */

  /** Elapsed run time from the clock, excluding paused spans. */
  private elapsedMs(): number {
    if (!this.isActive) return this.accumulatedMs;
    if (this.pausedAtMs !== null) return this.accumulatedMs;
    return this.accumulatedMs + (Date.now() - this.startedAtMs);
  }

  public getState(): GpsState {
    const durationSeconds = Math.floor(this.elapsedMs() / 1000);
    const km = this.distanceMeters / 1000;
    const hours = durationSeconds / 3600;
    const speedKmh = hours > 0 ? km / hours : 0;
    const paceMinKm = km > 0.05 ? durationSeconds / 60 / km : 0;
    const targetDistanceMeters = Math.round(this.targetSteps * METERS_PER_STEP);

    return {
      isActive: this.isActive,
      isPaused: this.pausedAtMs !== null,
      mode: this.mode,
      isVerified: this.mode === 'gps',
      durationSeconds,
      distanceMeters: Math.round(this.distanceMeters),
      stepsCount: this.stepsCount,
      currentPaceMinKm: Math.round(paceMinKm * 10) / 10,
      currentSpeedKmh: Math.round(speedKmh * 10) / 10,
      targetSteps: this.targetSteps,
      targetDistanceMeters,
      isTargetMet:
        this.stepsCount >= this.targetSteps || this.distanceMeters >= targetDistanceMeters,
      coordinatesCount: this.coordinates.length,
      gpsAccuracy: this.gpsAccuracy,
      error: this.error,
      hasFix: this.hasFix
    };
  }

  /* ── lifecycle ────────────────────────────────────────────────────────── */

  /**
   * Starts a walk.
   * @param targetSteps goal for this session
   * @param mode 'gps' for a verified walk, 'simulator' for an explicit
   *             indoor/treadmill session that will NOT secure the streak.
   */
  public startWalk(targetSteps: number = 3000, mode: GpsMode = 'gps'): void {
    if (this.isActive) return;

    this.isActive = true;
    this.mode = mode;
    this.targetSteps = targetSteps;
    this.startedAtMs = Date.now();
    this.accumulatedMs = 0;
    this.pausedAtMs = null;
    this.distanceMeters = 0;
    this.stepsCount = 0;
    this.lastPosition = null;
    this.coordinates = [];
    this.gpsAccuracy = null;
    this.hasFix = false;
    this.error = null;

    // Repaints the live readout. Duration itself comes from the clock, so a
    // throttled or skipped tick costs nothing but a delayed repaint.
    this.uiTimerId = setInterval(() => this.notify(), 1000);

    if (mode === 'simulator') {
      this.startSimulator();
    } else {
      this.startGeolocation();
    }

    this.persist();
    this.notify();
  }

  private startGeolocation(): void {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.error =
        'This device has no location services, so a walk cannot be verified. Use indoor mode to log an unverified session.';
      this.notify();
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handleGpsUpdate(pos),
      (err) => this.handleGpsError(err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
    );
  }

  /**
   * Surfaces the real failure. Crucially this does NOT fall back to synthetic
   * movement — a denied permission must not be able to earn a streak day.
   */
  private handleGpsError(err: GeolocationPositionError): void {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        this.error =
          'Location permission is denied, so this walk cannot be verified. Allow location in Settings, or use indoor mode for an unverified session.';
        break;
      case err.POSITION_UNAVAILABLE:
        this.error =
          'No GPS signal yet. Step outside or wait for a fix — nothing is being counted until then.';
        break;
      case err.TIMEOUT:
        this.error = 'Timed out waiting for a GPS fix. Still trying.';
        break;
      default:
        this.error = `Location error: ${err.message}`;
    }
    this.notify();
  }

  private handleGpsUpdate(pos: GeolocationPosition): void {
    if (this.pausedAtMs !== null || !this.isActive) return;

    const { latitude, longitude, accuracy } = pos.coords;
    this.gpsAccuracy = Math.round(accuracy);

    // A fix this vague would add noise, not distance.
    if (accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
      this.error = `Waiting for a better GPS fix (±${Math.round(accuracy)}m).`;
      this.notify();
      return;
    }

    this.hasFix = true;
    this.error = null;
    const now = Date.now();

    if (this.lastPosition) {
      const dist = haversineMeters(
        this.lastPosition.lat,
        this.lastPosition.lng,
        latitude,
        longitude
      );
      if (dist >= MIN_SEGMENT_METERS && dist < MAX_SEGMENT_METERS) {
        this.distanceMeters += dist;
        this.stepsCount += Math.round(dist * STEPS_PER_METER);
        this.lastPosition = { lat: latitude, lng: longitude, timestamp: now };
        this.coordinates.push(this.lastPosition);
      }
    } else {
      this.lastPosition = { lat: latitude, lng: longitude, timestamp: now };
      this.coordinates.push(this.lastPosition);
    }

    this.persist();
    this.notify();
  }

  /**
   * Explicit indoor/treadmill mode. Advances a plausible walking pace so the
   * user can time an indoor session — but the resulting record is marked
   * unverified and is worth no XP.
   */
  private startSimulator(): void {
    if (this.simTimerId) clearInterval(this.simTimerId);
    this.hasFix = true;
    this.simTimerId = setInterval(() => {
      if (!this.isActive || this.pausedAtMs !== null) return;
      const delta = 1.35 + (Math.random() * 0.3 - 0.15); // ~4.9 km/h
      this.distanceMeters += delta;
      this.stepsCount += Math.round(delta * STEPS_PER_METER);
      this.notify();
    }, 1000);
  }

  public togglePause(): void {
    if (!this.isActive) return;
    if (this.pausedAtMs === null) {
      this.accumulatedMs += Date.now() - this.startedAtMs;
      this.pausedAtMs = Date.now();
      // Drop the stale anchor so the first fix after resuming does not book a
      // straight-line segment across wherever the user walked while paused.
      this.lastPosition = null;
    } else {
      this.startedAtMs = Date.now();
      this.pausedAtMs = null;
    }
    this.persist();
    this.notify();
  }

  /**
   * Ends the walk and files it. A session only counts toward the day when it
   * is GPS-verified AND hit the minimum milestone.
   */
  public finishWalk(): GpsWalkSession | null {
    if (!this.isActive) return null;

    const durationSeconds = Math.floor(this.elapsedMs() / 1000);
    this.teardownTimers();

    const targetDistanceMeters = Math.round(this.targetSteps * METERS_PER_STEP);
    const hitMilestone =
      this.stepsCount >= Math.min(500, this.targetSteps) ||
      this.distanceMeters >= Math.min(400, targetDistanceMeters);

    const session: GpsWalkSession = {
      id: `walk-${Date.now()}`,
      date: toDateKey(),
      startTime: new Date(Date.now() - durationSeconds * 1000).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds,
      distanceMeters: Math.round(this.distanceMeters),
      stepsCount: this.stepsCount,
      targetSteps: this.targetSteps,
      completed: hitMilestone,
      isVerified: this.mode === 'gps' && this.hasFix,
      coordinates: this.coordinates
    };

    db.saveWalkSession(session);

    this.isActive = false;
    this.pausedAtMs = null;
    this.clearPersisted();
    this.notify();

    return session;
  }

  public cancelWalk(): void {
    this.teardownTimers();
    this.isActive = false;
    this.pausedAtMs = null;
    this.distanceMeters = 0;
    this.stepsCount = 0;
    this.coordinates = [];
    this.error = null;
    this.clearPersisted();
    this.notify();
  }

  private teardownTimers(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
    if (this.uiTimerId) clearInterval(this.uiTimerId);
    this.uiTimerId = null;
    if (this.simTimerId) clearInterval(this.simTimerId);
    this.simTimerId = null;
  }

  /* ── crash/eviction resilience ────────────────────────────────────────── */

  private persist(): void {
    if (!this.isActive) return;
    const snapshot: PersistedWalk = {
      startedAtMs: this.startedAtMs,
      accumulatedMs: this.accumulatedMs,
      pausedAtMs: this.pausedAtMs,
      distanceMeters: this.distanceMeters,
      stepsCount: this.stepsCount,
      targetSteps: this.targetSteps,
      mode: this.mode,
      // Cap the trail; a long walk otherwise grows this without bound.
      coordinates: this.coordinates.slice(-500)
    };
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      /* a lost snapshot only costs resume-after-crash, not the live session */
    }
  }

  private clearPersisted(): void {
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      /* nothing to do */
    }
  }

  /**
   * Restores a walk that was interrupted by the WebView being evicted. The
   * session comes back paused so the user consciously decides whether to
   * resume or file it.
   */
  private restoreActiveSession(): void {
    let snapshot: PersistedWalk | null = null;
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      snapshot = raw ? (JSON.parse(raw) as PersistedWalk) : null;
    } catch {
      snapshot = null;
    }
    if (!snapshot) return;

    // Anything older than 12 hours is stale, not interrupted.
    const age = Date.now() - (snapshot.pausedAtMs ?? snapshot.startedAtMs);
    if (age > 12 * 60 * 60 * 1000) {
      this.clearPersisted();
      return;
    }

    this.isActive = true;
    this.mode = snapshot.mode;
    this.targetSteps = snapshot.targetSteps;
    this.distanceMeters = snapshot.distanceMeters;
    this.stepsCount = snapshot.stepsCount;
    this.coordinates = snapshot.coordinates || [];
    this.accumulatedMs =
      snapshot.accumulatedMs +
      (snapshot.pausedAtMs === null ? Date.now() - snapshot.startedAtMs : 0);
    this.pausedAtMs = Date.now();
    this.startedAtMs = Date.now();
    this.lastPosition = null;
    this.hasFix = snapshot.mode === 'simulator';
    this.error = 'This walk was interrupted. Resume to keep tracking, or finish to log it.';
  }
}

/** Great-circle distance in metres. */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const gpsTracker = new GpsTrackerService();
