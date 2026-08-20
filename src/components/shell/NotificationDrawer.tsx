/**
 * NotificationDrawer.tsx — in-app notification centre and reminder settings.
 *
 * Surfaces the two Android permissions that actually determine whether
 * reminders arrive, rather than assuming both: POST_NOTIFICATIONS, and the
 * separate "alarms & reminders" (SCHEDULE_EXACT_ALARM) setting that Android 13+
 * does not grant at install. Without the second one, reminders still fire —
 * just inexactly — and the drawer says so instead of failing silently.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  Trash2,
  Zap,
  Flame,
  Shield,
  Clock,
  Bot,
  BellRing,
  AlarmClock,
  Settings2
} from 'lucide-react';
import {
  notificationService,
  AppNotification,
  NotificationStatus
} from '../../services/notificationService';
import { audioEngine } from '../../services/audioEngine';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(
    notificationService.getNotifications()
  );
  const [status, setStatus] = useState<NotificationStatus>({
    granted: false,
    exactAlarms: false,
    scheduledCount: 0
  });
  const [isBusy, setIsBusy] = useState(false);

  const refreshStatus = useCallback(() => {
    void notificationService.getStatus().then(setStatus);
  }, []);

  useEffect(() => notificationService.subscribe(setNotifications), []);

  useEffect(() => {
    if (!isOpen) return;
    refreshStatus();
    notificationService.markAllAsRead();
  }, [isOpen, refreshStatus]);

  if (!isOpen) return null;

  const handleEnable = async () => {
    setIsBusy(true);
    const next = await notificationService.requestPermissions();
    setStatus(next);
    setIsBusy(false);
    if (next.granted) {
      audioEngine.playTaskCompleteChime();
      audioEngine.triggerHaptic('success');
    }
  };

  const handleEnableExact = async () => {
    setIsBusy(true);
    await notificationService.requestExactAlarms();
    // The user leaves for a system screen; re-read on return.
    refreshStatus();
    setIsBusy(false);
  };

  const handleTest = async () => {
    setIsBusy(true);
    await notificationService.sendImmediateNotification(
      'Test notification',
      'If you can see this, reminders are working.',
      'SYSTEM'
    );
    audioEngine.triggerHaptic('medium');
    setIsBusy(false);
  };

  const iconFor = (type: AppNotification['type']) => {
    switch (type) {
      case 'STREAK':
        return <Flame size={16} aria-hidden="true" />;
      case 'FOCUS':
        return <Clock size={16} aria-hidden="true" />;
      case 'BADGE':
        return <Shield size={16} aria-hidden="true" />;
      case 'COACH':
        return <Bot size={16} aria-hidden="true" />;
      case 'ROUTINE':
        return <CheckCircle2 size={16} aria-hidden="true" />;
      default:
        return <Zap size={16} aria-hidden="true" />;
    }
  };

  const timeAgo = (iso: string): string => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="md3-scrim" role="dialog" aria-modal="true" aria-labelledby="notif-title">
      <div className="md3-dialog notif-dialog">
        <div className="dialog-header">
          <div className="dialog-header-title">
            <Bell size={20} aria-hidden="true" />
            <div>
              <h3 id="notif-title">Notifications</h3>
              <span className="dialog-subtitle">
                {status.scheduledCount > 0
                  ? `${status.scheduledCount} reminder${status.scheduledCount === 1 ? '' : 's'} scheduled`
                  : 'No reminders scheduled'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="notif-body">
          {/* Permission 1: can we post at all? */}
          {!status.granted && (
            <div className="permission-card">
              <div>
                <div className="permission-title">Turn on reminders</div>
                <p className="permission-body">
                  Morning sequence, focus block, evening streak check and wind-down.
                </p>
              </div>
              <button
                type="button"
                className="md3-button-filled md3-button-sm"
                onClick={handleEnable}
                disabled={isBusy}
              >
                Allow
              </button>
            </div>
          )}

          {/* Permission 2: exact alarms (Android 13+, granted separately). */}
          {status.granted && !status.exactAlarms && (
            <div className="permission-card permission-card-muted">
              <div>
                <div className="permission-title">
                  <AlarmClock size={14} aria-hidden="true" /> Allow exact timing
                </div>
                <p className="permission-body">
                  Reminders currently arrive within a few minutes of their time. Allowing
                  &ldquo;alarms &amp; reminders&rdquo; makes them exact.
                </p>
              </div>
              <button
                type="button"
                className="md3-button-tonal md3-button-sm"
                onClick={handleEnableExact}
                disabled={isBusy}
              >
                <Settings2 size={13} aria-hidden="true" />
                Open
              </button>
            </div>
          )}

          <div className="notif-controls">
            <button
              type="button"
              onClick={handleTest}
              className="md3-button-tonal md3-button-sm"
              disabled={isBusy || !status.granted}
            >
              <BellRing size={13} aria-hidden="true" />
              Send a test
            </button>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => notificationService.clearAll()}
                className="md3-button-text md3-button-sm"
              >
                <Trash2 size={13} aria-hidden="true" />
                Clear all
              </button>
            )}
          </div>

          <div className="notif-feed">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <CheckCircle2 size={32} aria-hidden="true" />
                <div className="empty-state-title">Nothing here yet</div>
                <p>Reminders and milestone alerts will collect on this screen.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notif-row ${n.isRead ? 'read' : 'unread'}`}>
                  <div className={`notif-row-icon type-${n.type.toLowerCase()}`}>
                    {iconFor(n.type)}
                  </div>
                  <div className="notif-row-content">
                    <div className="notif-row-head">
                      <span className="notif-row-title">{n.title}</span>
                      <span className="notif-row-time">{timeAgo(n.timestamp)}</span>
                    </div>
                    <p className="notif-row-body">{n.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
