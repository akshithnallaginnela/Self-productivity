/**
 * androidSystem.ts — Android lifecycle, hardware back, wake lock and toasts.
 *
 * Responsibilities:
 *   1. Hardware/predictive back dispatch through a priority stack, with a
 *      double-tap-to-exit guard at the root.
 *   2. Foreground/background notifications, so the app can run its daily
 *      rollover when it comes back after midnight.
 *   3. Screen wake lock for focus and walk sessions, re-acquired after the
 *      system drops it (which it does on every visibility change).
 *   4. Material-style toasts.
 *   5. Haptics.
 */

import { App as CapApp } from '@capacitor/app';
import { isNativePlatform } from './widgetBridge';

export interface BackButtonHandler {
  id: string;
  priority: number; // higher runs first
  handler: () => boolean; // true = handled, stop here
}

type ResumeListener = () => void;

class AndroidSystemManager {
  private backHandlers: BackButtonHandler[] = [];
  private lastBackPressTime = 0;
  private wakeLockSentinel: WakeLockSentinel | null = null;
  private isWakeLockWanted = false;
  private toastElement: HTMLDivElement | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeListeners: ResumeListener[] = [];

  constructor() {
    this.initBackButtonListener();
    this.initLifecycleWatcher();
  }

  /** True when running inside the Android shell rather than a browser tab. */
  public get isNative(): boolean {
    return isNativePlatform();
  }

  /* ── back button ──────────────────────────────────────────────────────── */

  private initBackButtonListener(): void {
    void CapApp.addListener('backButton', () => this.handleHardwareBack()).catch(() => {
      // Browser: approximate with history popstate so the UI is testable.
      if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => this.handleHardwareBack());
      }
    });
  }

  public handleHardwareBack(): void {
    const sorted = [...this.backHandlers].sort((a, b) => b.priority - a.priority);
    for (const item of sorted) {
      let handled = false;
      try {
        handled = item.handler();
      } catch (err) {
        console.error(`[androidSystem] Back handler "${item.id}" threw:`, err);
      }
      if (handled) {
        this.triggerHaptic('light');
        return;
      }
    }

    // Root: require a second press within 2s before exiting.
    const now = Date.now();
    if (now - this.lastBackPressTime < 2000) {
      void CapApp.exitApp().catch(() => {});
    } else {
      this.lastBackPressTime = now;
      this.showToast('Press back again to exit');
      this.triggerHaptic('light');
    }
  }

  /** Registers a back handler. Returns an unsubscribe function. */
  public registerBackHandler(
    id: string,
    priority: number,
    handler: () => boolean
  ): () => void {
    this.backHandlers = this.backHandlers.filter((h) => h.id !== id);
    this.backHandlers.push({ id, priority, handler });
    return () => {
      this.backHandlers = this.backHandlers.filter((h) => h.id !== id);
    };
  }

  /* ── lifecycle ────────────────────────────────────────────────────────── */

  private initLifecycleWatcher(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        // The OS releases the wake lock whenever the page is hidden.
        if (this.isWakeLockWanted && !this.wakeLockSentinel) void this.requestWakeLock();
        this.emitResume();
      });
    }

    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) this.emitResume();
    }).catch(() => {
      /* browser — visibilitychange above already covers it */
    });
  }

  /**
   * Subscribes to "app returned to the foreground". Used to run the daily
   * rollover: without it, an app left open across midnight never rolls over.
   */
  public onResume(listener: ResumeListener): () => void {
    this.resumeListeners.push(listener);
    return () => {
      this.resumeListeners = this.resumeListeners.filter((l) => l !== listener);
    };
  }

  private emitResume(): void {
    for (const l of this.resumeListeners) {
      try {
        l();
      } catch (err) {
        console.error('[androidSystem] Resume listener threw:', err);
      }
    }
  }

  /* ── wake lock ────────────────────────────────────────────────────────── */

  /** Keeps the screen on during a focus or walk session. */
  public async requestWakeLock(): Promise<boolean> {
    this.isWakeLockWanted = true;
    try {
      if ('wakeLock' in navigator && navigator.wakeLock) {
        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
        return true;
      }
    } catch (err) {
      // Battery saver refuses wake locks; that is normal, not a bug.
      console.info('[androidSystem] Wake lock unavailable:', err);
    }
    return false;
  }

  public releaseWakeLock(): void {
    this.isWakeLockWanted = false;
    const sentinel = this.wakeLockSentinel;
    this.wakeLockSentinel = null;
    if (sentinel) void sentinel.release().catch(() => {});
  }

  /* ── toast ────────────────────────────────────────────────────────────── */

  /** Shows a transient message. Styling lives in components.css. */
  public showToast(message: string, durationMs = 2000): void {
    if (typeof document === 'undefined') return;

    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.toastElement) this.toastElement.remove();

    const toast = document.createElement('div');
    toast.className = 'android-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;

    document.body.appendChild(toast);
    this.toastElement = toast;

    this.toastTimer = setTimeout(() => {
      if (this.toastElement === toast) {
        toast.remove();
        this.toastElement = null;
      }
      this.toastTimer = null;
    }, durationMs);
  }

  /* ── haptics ──────────────────────────────────────────────────────────── */

  /**
   * Vibration feedback via the Web Vibration API, which the Android WebView
   * supports given the VIBRATE permission. Silently absent on desktop.
   */
  public triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' = 'light'): void {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const patterns: Record<typeof type, number | number[]> = {
      light: 15,
      medium: [20, 30, 20],
      heavy: [35, 40, 35],
      success: [15, 30, 45, 30, 60]
    };
    try {
      navigator.vibrate(patterns[type]);
    } catch {
      /* nothing meaningful to do */
    }
  }
}

export const androidSystem = new AndroidSystemManager();
