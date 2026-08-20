/**
 * notificationService.ts — daily reminders and the in-app notification centre.
 *
 * Three things this gets right that a naive implementation does not:
 *
 * 1. EXACT ALARMS ARE NEGOTIATED, NOT ASSUMED. From Android 13 the
 *    SCHEDULE_EXACT_ALARM permission is not granted at install. If it is not
 *    held, `allowWhileIdle` is dropped and the reminders are scheduled
 *    inexactly rather than failing silently — a reminder a few minutes late
 *    beats one that never arrives.
 *
 * 2. REMINDERS ARE RESCHEDULED ON EVERY LAUNCH, not once at permission grant.
 *
 * 3. THE EVENING ALERT IS CONDITIONAL. The "streak at risk" reminder is
 *    cancelled on days the streak is already secured. Warning someone in
 *    recovery about a danger that does not exist is how an app gets muted.
 *
 * Failures are logged rather than swallowed by a bare catch, so a device where
 * notifications never arrive is diagnosable from logcat.
 */

import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { db, toDateKey } from './db';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'STREAK' | 'ROUTINE' | 'FOCUS' | 'BADGE' | 'COACH' | 'SYSTEM';
  isRead: boolean;
}

const STORAGE_KEY_NOTIFS = 'rw_notifications_history_v2';
const CHANNEL_ID = 'sovereign_discipline';

/** Stable ids so a reschedule replaces rather than duplicates. */
const NOTIF_IDS = {
  MORNING: 101,
  FOCUS: 102,
  STREAK_RISK: 103,
  WIND_DOWN: 104
} as const;

export interface NotificationStatus {
  /** POST_NOTIFICATIONS granted. */
  granted: boolean;
  /** SCHEDULE_EXACT_ALARM held — reminders fire to the minute when true. */
  exactAlarms: boolean;
  /** Reminders currently registered with the OS. */
  scheduledCount: number;
}

class NotificationService {
  private notifications: AppNotification[] = [];
  private listeners: Array<(notifs: AppNotification[]) => void> = [];
  private channelReady = false;

  constructor() {
    this.loadHistory();
  }

  /* ── permissions & channel ────────────────────────────────────────────── */

  private async ensureChannel(): Promise<void> {
    if (this.channelReady) return;
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Discipline reminders',
        description: 'Morning ritual, focus block, streak and wind-down reminders',
        importance: 4, // HIGH: heads-up, but not the full-screen alarm treatment
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#D97706'
      });
      this.channelReady = true;
    } catch (err) {
      // Web/PWA has no channels; that is expected and not an error there.
      console.info('[notifications] Channel not created (non-Android platform?):', err);
    }
  }

  /** Current permission and scheduling state, for display in the drawer. */
  public async getStatus(): Promise<NotificationStatus> {
    let granted = false;
    let exactAlarms = false;
    let scheduledCount = 0;

    try {
      granted = (await LocalNotifications.checkPermissions()).display === 'granted';
    } catch {
      granted =
        typeof window !== 'undefined' && 'Notification' in window
          ? Notification.permission === 'granted'
          : false;
    }

    try {
      exactAlarms = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
    } catch {
      exactAlarms = false; // not Android, or an older plugin
    }

    try {
      scheduledCount = (await LocalNotifications.getPending()).notifications.length;
    } catch {
      scheduledCount = 0;
    }

    return { granted, exactAlarms, scheduledCount };
  }

  /** Requests notification permission, then schedules. */
  public async requestPermissions(): Promise<NotificationStatus> {
    await this.ensureChannel();

    try {
      const status = await LocalNotifications.requestPermissions();
      if (status.display === 'granted') {
        await this.scheduleDailyReminders();
        this.addInAppNotification({
          title: 'Reminders on',
          body: 'Morning, focus, streak and wind-down reminders are scheduled.',
          type: 'SYSTEM'
        });
      }
    } catch {
      // Browser fallback.
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') await this.scheduleDailyReminders();
        } catch (err) {
          console.warn('[notifications] Web permission request failed:', err);
        }
      }
    }

    return this.getStatus();
  }

  /**
   * Opens the system screen where the user grants "alarms & reminders".
   * Only meaningful on Android 13+.
   */
  public async requestExactAlarms(): Promise<boolean> {
    try {
      const result = await LocalNotifications.changeExactNotificationSetting();
      const granted = result.exact_alarm === 'granted';
      if (granted) await this.scheduleDailyReminders();
      return granted;
    } catch (err) {
      console.warn('[notifications] Exact alarm setting unavailable:', err);
      return false;
    }
  }

  /* ── scheduling ───────────────────────────────────────────────────────── */

  /**
   * Rebuilds the daily reminder set. Safe to call on every launch — pending
   * notifications are cancelled first, and ids are stable.
   */
  public async scheduleDailyReminders(): Promise<void> {
    await this.ensureChannel();

    const { granted, exactAlarms } = await this.getStatus();
    if (!granted) return;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (err) {
      console.warn('[notifications] Could not clear pending notifications:', err);
    }

    const profile = db.getProfile();
    const name = profile.displayName.trim();
    const greeting = name ? `${name}, your` : 'Your';

    // Without the exact-alarm permission, allowWhileIdle would make the OS
    // reject the schedule outright. Degrade to inexact delivery instead.
    const base = { repeats: true, ...(exactAlarms ? { allowWhileIdle: true } : {}) };

    const notifications: ScheduleOptions['notifications'] = [
      {
        id: NOTIF_IDS.MORNING,
        title: 'Morning sequence',
        body: `${greeting} morning sequence starts now. Hydrate and get sunlight.`,
        schedule: { on: { hour: 5, minute: 30 }, ...base },
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher_foreground'
      },
      {
        id: NOTIF_IDS.FOCUS,
        title: 'Deep work block',
        body: 'Time for your 30-minute focus block.',
        schedule: { on: { hour: 10, minute: 0 }, ...base },
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher_foreground'
      },
      {
        id: NOTIF_IDS.WIND_DOWN,
        title: 'Wind down',
        body: 'Screens off. Start moving toward sleep.',
        schedule: { on: { hour: 21, minute: 30 }, ...base },
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher_foreground'
      }
    ];

    // Only warn about the streak when it is actually at risk today.
    if (!db.isStreakSecuredToday()) {
      notifications.push({
        id: NOTIF_IDS.STREAK_RISK,
        title: 'Streak not secured yet',
        body: 'Log one discipline before midnight to keep your streak. Your sobriety count is safe either way.',
        schedule: { on: { hour: 20, minute: 0 }, ...base },
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher_foreground'
      });
    }

    try {
      await LocalNotifications.schedule({ notifications });
    } catch (err) {
      console.error('[notifications] Scheduling failed:', err);
      this.addInAppNotification({
        title: 'Reminders could not be scheduled',
        body: 'Check that notifications, and "alarms & reminders", are allowed for Sovereign Eagle in Android settings.',
        type: 'SYSTEM'
      });
    }
  }

  /**
   * Cancels today's evening streak warning — called the moment the streak is
   * secured, so the 8pm alert does not fire on a day already won.
   */
  public async cancelStreakRiskAlert(): Promise<void> {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: NOTIF_IDS.STREAK_RISK }] });
    } catch {
      /* nothing scheduled, or not on Android */
    }
  }

  /** Fires an immediate notification and records it in the in-app centre. */
  public async sendImmediateNotification(
    title: string,
    body: string,
    type: AppNotification['type']
  ): Promise<void> {
    this.addInAppNotification({ title, body, type });

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            // Keep well clear of the reserved reminder ids.
            id: 10_000 + Math.floor(Math.random() * 50_000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 500) },
            channelId: CHANNEL_ID,
            smallIcon: 'ic_launcher_foreground'
          }
        ]
      });
    } catch {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(title, { body, icon: '/icon-192.png' });
        } catch (err) {
          console.warn('[notifications] Web notification failed:', err);
        }
      }
    }
  }

  /** Congratulates a newly unlocked milestone. */
  public async notifyBadgeUnlocked(badgeTitle: string): Promise<void> {
    await this.sendImmediateNotification('Milestone unlocked', badgeTitle, 'BADGE');
  }

  /* ── in-app notification centre ───────────────────────────────────────── */

  private loadHistory(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NOTIFS);
      this.notifications = raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      // Start empty rather than inventing sample alerts.
      this.notifications = [];
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(this.notifications));
    } catch (err) {
      console.warn('[notifications] Could not persist history:', err);
    }
    this.notify();
  }

  private notify(): void {
    const snapshot = [...this.notifications];
    for (const l of this.listeners) l(snapshot);
  }

  public subscribe(listener: (notifs: AppNotification[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.notifications]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  public markAllAsRead(): void {
    if (this.notifications.every((n) => n.isRead)) return; // avoid a pointless write+render
    this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
    this.saveHistory();
  }

  public clearAll(): void {
    this.notifications = [];
    this.saveHistory();
  }

  public addInAppNotification(
    data: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>
  ): void {
    const now = new Date();
    const entry: AppNotification = {
      ...data,
      id: `notif-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now.toISOString(),
      isRead: false
    };
    this.notifications = [entry, ...this.notifications].slice(0, 40);
    this.saveHistory();
  }

  /**
   * Records the daily-rollover outcome in the notification centre, so a lapsed
   * streak is explained rather than just silently reset.
   */
  public reportRollover(result: { daysMissed: number; streakLapsed: boolean }): void {
    if (!result.streakLapsed) return;
    const days = result.daysMissed;
    this.addInAppNotification({
      title: 'Streak reset',
      body: `No discipline was logged for ${days === 1 ? 'a day' : `${days} days`}, so the daily streak restarted. Your sobriety count is unchanged.`,
      type: 'STREAK'
    });
  }

  /** Today's date key — exposed so the drawer can group by day. */
  public today(): string {
    return toDateKey();
  }
}

export const notificationService = new NotificationService();
