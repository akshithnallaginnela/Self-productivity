/**
 * gpsTracker.ts — Real-time GPS Walking & Step Calculation Service
 *
 * Implements high-precision Geolocation tracking with:
 *   - Continuous position watching via navigator.geolocation
 *   - Haversine distance accumulation with GPS noise filtration
 *   - Biomechanical step counting (1 meter ≈ 1.31 steps)
 *   - Live duration, pace (min/km), and speed (km/h) computation
 *   - Desktop / indoor simulator fallback mode for seamless testing
 */

import { GpsWalkSession } from '../types';
import { db } from './db';

export interface GpsState {
  isActive: boolean;
  isPaused: boolean;
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
  isSimulated: boolean;
  error: string | null;
}

class GpsTrackerService {
  private watchId: number | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private simTimerId: ReturnType<typeof setInterval> | null = null;

  private startTime: number = 0;
  private durationSeconds: number = 0;
  private distanceMeters: number = 0;
  private stepsCount: number = 0;
  private lastPosition: { lat: number; lng: number; timestamp: number } | null = null;
  private coordinates: Array<{ lat: number; lng: number; timestamp: number }> = [];

  private isActive: boolean = false;
  private isPaused: boolean = false;
  private targetSteps: number = 3000;
  private targetDistanceMeters: number = 2000; // 2.0 km
  private gpsAccuracy: number | null = null;
  private isSimulated: boolean = false;
  private error: string | null = null;

  private listeners: ((state: GpsState) => void)[] = [];

  /**
   * Subscribes to GPS tracking state updates.
   */
  public subscribe(listener: (state: GpsState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  /**
   * Returns current snapshot of GPS walk tracker.
   */
  public getState(): GpsState {
    const km = this.distanceMeters / 1000;
    const speedKmh = this.durationSeconds > 0 ? (km / (this.durationSeconds / 3600)) : 0;
    const paceMinKm = km > 0.05 ? ((this.durationSeconds / 60) / km) : 0;

    return {
      isActive: this.isActive,
      isPaused: this.isPaused,
      durationSeconds: this.durationSeconds,
      distanceMeters: Math.round(this.distanceMeters),
      stepsCount: this.stepsCount,
      currentPaceMinKm: Math.round(paceMinKm * 10) / 10,
      currentSpeedKmh: Math.round(speedKmh * 10) / 10,
      targetSteps: this.targetSteps,
      targetDistanceMeters: this.targetDistanceMeters,
      isTargetMet: this.stepsCount >= this.targetSteps || this.distanceMeters >= this.targetDistanceMeters,
      coordinatesCount: this.coordinates.length,
      gpsAccuracy: this.gpsAccuracy,
      isSimulated: this.isSimulated,
      error: this.error
    };
  }

  /**
   * Starts a new GPS walk session.
   */
  public startWalk(targetSteps: number = 3000, forceSimulation: boolean = false): void {
    if (this.isActive) return;

    this.isActive = true;
    this.isPaused = false;
    this.durationSeconds = 0;
    this.distanceMeters = 0;
    this.stepsCount = 0;
    this.lastPosition = null;
    this.coordinates = [];
    this.startTime = Date.now();
    this.targetSteps = targetSteps;
    this.targetDistanceMeters = Math.round(targetSteps * 0.762); // ~0.76m per step
    this.error = null;
    this.isSimulated = forceSimulation;

    // Start active duration timer
    this.timerId = setInterval(() => {
      if (!this.isPaused) {
        this.durationSeconds += 1;
        this.notify();
      }
    }, 1000);

    if (forceSimulation || !('geolocation' in navigator)) {
      this.startSimulatedMovement();
    } else {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handleGpsUpdate(pos),
        (err) => {
          console.warn('GPS signal unavailable, falling back to simulated walk sensor:', err.message);
          this.error = `GPS: ${err.message}. Using built-in motion estimation.`;
          this.startSimulatedMovement();
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 3000
        }
      );
    }

    this.notify();
  }

  /**
   * Handles incoming GPS coordinate fixes.
   */
  private handleGpsUpdate(pos: GeolocationPosition): void {
    if (this.isPaused) return;

    const { latitude, longitude, accuracy } = pos.coords;
    this.gpsAccuracy = Math.round(accuracy);
    const now = Date.now();

    if (this.lastPosition) {
      const dist = this.calculateHaversineDistance(
        this.lastPosition.lat,
        this.lastPosition.lng,
        latitude,
        longitude
      );

      // Only accumulate if distance is reasonable (filters out jitter < 1.5m and teleport jumps > 50m in 1s)
      if (dist >= 1.5 && dist < 50) {
        this.distanceMeters += dist;
        // Average human stride: 1 meter = 1.312 steps
        const addedSteps = Math.round(dist * 1.312);
        this.stepsCount += addedSteps;
        this.coordinates.push({ lat: latitude, lng: longitude, timestamp: now });
        this.lastPosition = { lat: latitude, lng: longitude, timestamp: now };
      }
    } else {
      this.lastPosition = { lat: latitude, lng: longitude, timestamp: now };
      this.coordinates.push(this.lastPosition);
    }

    this.notify();
  }

  /**
   * Fallback motion simulator for testing / indoor workouts.
   */
  private startSimulatedMovement(): void {
    this.isSimulated = true;
    if (this.simTimerId) clearInterval(this.simTimerId);

    // Simulates brisk warrior walking: ~1.4 m/s (5 km/h) = ~1.8 steps/sec
    this.simTimerId = setInterval(() => {
      if (!this.isPaused && this.isActive) {
        const deltaDistance = 1.35 + (Math.random() * 0.3 - 0.15); // ~1.35m per tick
        this.distanceMeters += deltaDistance;
        this.stepsCount += Math.round(deltaDistance * 1.312);
        this.notify();
      }
    }, 1000);
  }

  /**
   * Pauses / Resumes active walking session.
   */
  public togglePause(): void {
    if (!this.isActive) return;
    this.isPaused = !this.isPaused;
    this.notify();
  }

  /**
   * Completes the walk, saves session to DB, and extends the Duolingo streak!
   */
  public finishWalk(): GpsWalkSession | null {
    if (!this.isActive) return null;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.simTimerId) {
      clearInterval(this.simTimerId);
      this.simTimerId = null;
    }

    const today = new Date().toISOString().split('T')[0];
    const isCompleted = this.stepsCount >= 500 || this.distanceMeters >= 400; // minimum milestone

    const session: GpsWalkSession = {
      id: `walk-${Date.now()}`,
      date: today,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: this.durationSeconds,
      distanceMeters: Math.round(this.distanceMeters),
      stepsCount: this.stepsCount,
      targetSteps: this.targetSteps,
      completed: isCompleted,
      coordinates: this.coordinates
    };

    // Save walk session in DB and officially evaluate streak!
    db.saveWalkSession(session);

    this.isActive = false;
    this.isPaused = false;
    this.notify();

    return session;
  }

  /**
   * Discards current walk session.
   */
  public cancelWalk(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.simTimerId) {
      clearInterval(this.simTimerId);
      this.simTimerId = null;
    }
    this.isActive = false;
    this.isPaused = false;
    this.notify();
  }

  /**
   * Haversine formula to compute great-circle distance in meters between two lat/lng pairs.
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const gpsTracker = new GpsTrackerService();
