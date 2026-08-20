/**
 * GeminiCoachCard.tsx — Gemini AI Warrior Coach & Self-Mastery Advisor
 *
 * Implements:
 *   1. Real-time archetype-tailored daily coaching directive & motivation
 *   2. Voice Guidance Audio Readout using HTML5 Web Speech Synthesis API
 *   3. Personalized Daily Mission Generator (3 Tactical Missions with XP awards)
 *   4. Proactive Tactical Scenarios (Urge Strike, Procrastination, Negotiation, Sleep)
 *   5. Interactive "Ask Warrior Coach" real-time advisor
 *   6. Direct Gemini API Key configuration support + robust offline reasoning fallback
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  RefreshCw,
  Key,
  ShieldCheck,
  ChevronRight,
  Flame,
  CheckCircle2,
  Volume2,
  VolumeX,
  Target,
  Zap,
  Award,
  AlertTriangle
} from 'lucide-react';
import { db } from '../../services/db';
import { geminiService } from '../../services/geminiService';
import { audioEngine } from '../../services/audioEngine';
import { GeminiCoachInsight, UserProfile } from '../../types';

interface DailyMission {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  xp: number;
}

export const GeminiCoachCard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [insight, setInsight] = useState<GeminiCoachInsight | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [coachResponse, setCoachResponse] = useState<string | null>(null);
  const [askingCoach, setAskingCoach] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  /* ── Daily AI Missions ───────────────────────────────────────────── */
  const [missions, setMissions] = useState<DailyMission[]>([
    { id: 'm-1', title: 'Complete 30m uninterrupted Deep Work without phone tab switching', category: 'Focus', completed: false, xp: 100 },
    { id: 'm-2', title: 'Withstand any mid-day dopamine dip with 10 slow diaphragmatic breaths', category: 'Resilience', completed: false, xp: 100 },
    { id: 'm-3', title: 'Perform 3km outdoor walk soaking natural daylight', category: 'Circadian', completed: false, xp: 100 }
  ]);

  /* ── API Key modal state ─────────────────────────────────────────── */
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(geminiService.getApiKey());
  const [keySaved, setKeySaved] = useState<boolean>(false);

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getProfile());
    });

    loadDailyInsight();

    return () => {
      unsub();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [profile.selectedArchetype]);

  const loadDailyInsight = async () => {
    const existing = db.getCoachInsights().find((i) => i.date === new Date().toISOString().split('T')[0]);
    if (existing) {
      setInsight(existing);
    } else {
      await handleGenerateInsight();
    }
  };

  const handleGenerateInsight = async () => {
    setLoading(true);
    try {
      const newInsight = await geminiService.generateDailyInsight();
      setInsight(newInsight);
    } finally {
      setLoading(false);
    }
  };

  /** Text-To-Speech voice readout of today's directive */
  const handleToggleVoice = () => {
    if (!('speechSynthesis' in window) || !insight) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = `${profile.selectedArchetype} Directive. Quote: ${insight.quote}. Challenge: ${insight.dailyDirective}. Urge Strategy: ${insight.urgeStrategy}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 0.9;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    audioEngine.triggerHaptic('light');
  };

  const handleAskCoach = async (promptText?: string) => {
    const textToSend = promptText || query;
    if (!textToSend.trim()) return;

    setAskingCoach(true);
    setCoachResponse(null);
    audioEngine.triggerHaptic('light');
    try {
      const response = await geminiService.askWarriorCoach(textToSend);
      setCoachResponse(response);
      audioEngine.playTaskCompleteChime();
    } finally {
      setAskingCoach(false);
    }
  };

  /** Toggle AI Daily Mission */
  const handleToggleMission = (missionId: string) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === missionId) {
          const updated = !m.completed;
          if (updated) {
            audioEngine.playTaskCompleteChime();
            audioEngine.triggerHaptic('success');
            db.updateProfile({ xpPoints: profile.xpPoints + m.xp });
          }
          return { ...m, completed: updated };
        }
        return m;
      })
    );
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    geminiService.setApiKey(apiKeyInput);
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
      setShowKeyModal(false);
      handleGenerateInsight();
    }, 1200);
  };

  return (
    <div className="ref-task-card ref-task-card-tinted" style={{ padding: '22px', position: 'relative' }}>
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <span className="md3-section-title" style={{ fontSize: '10px' }}>AI WARRIOR ADVISOR</span>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--md-sys-color-on-primary-container)', margin: 0 }}>
              Gemini Directive & Intelligence
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={handleToggleVoice}
            className="md3-button-tonal md3-button-sm"
            style={{
              padding: '0 10px',
              height: '32px',
              background: isSpeaking ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.7)',
              color: isSpeaking ? '#ffffff' : 'inherit'
            }}
            title={isSpeaking ? 'Stop voice audio' : 'Listen to spoken directive'}
            aria-label="Voice audio guidance"
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <button
            type="button"
            onClick={handleGenerateInsight}
            disabled={loading}
            className="md3-button-tonal md3-button-sm"
            style={{ padding: '0 10px', height: '32px', background: 'rgba(255,255,255,0.7)' }}
            title="Regenerate daily insight"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className="md3-button-tonal md3-button-sm"
            style={{ padding: '0 10px', height: '32px', background: 'rgba(255,255,255,0.7)' }}
            title="Configure Gemini API Key"
          >
            <Key size={13} />
          </button>
        </div>
      </div>

      {/* ── Daily Directive & Quote ─────────────────────────────────── */}
      {insight && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Stoic Quote Pill */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '14px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--md-sys-color-primary)', letterSpacing: '0.5px' }}>
              Daily Sovereign Motto ({profile.selectedArchetype})
            </div>
            <p style={{ fontSize: '13px', fontStyle: 'italic', fontWeight: 700, marginTop: '4px', lineHeight: 1.4, color: '#0f172a' }}>
              "{insight.quote}"
            </p>
          </div>

          {/* Actionable Challenge Directive */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '14px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--md-sys-color-primary)', letterSpacing: '0.5px' }}>
              ⚡ Today's Execution Challenge
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px', lineHeight: 1.4, color: 'var(--md-sys-color-on-surface)' }}>
              {insight.dailyDirective}
            </p>
          </div>

          {/* Urge Defusal Tactical Protocol */}
          <div style={{
            background: 'var(--md-sys-color-secondary-container)',
            borderRadius: '20px',
            padding: '14px 16px',
            color: 'var(--md-sys-color-on-secondary-container)'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🛡️ Urge Defusal Protocol
            </div>
            <p style={{ fontSize: '12px', fontWeight: 600, marginTop: '4px', lineHeight: 1.4 }}>
              {insight.urgeStrategy}
            </p>
          </div>
        </div>
      )}

      {/* ── Daily AI High-Leverage Missions ──────────────────────────── */}
      <div style={{
        marginTop: '14px',
        background: '#ffffff',
        borderRadius: '20px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={16} color="var(--md-sys-color-primary)" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
              Daily Tactical Missions
            </span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--md-sys-color-primary)' }}>
            +100 XP Each
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {missions.map((m) => (
            <div
              key={m.id}
              onClick={() => handleToggleMission(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '14px',
                background: m.completed ? 'var(--md-sys-color-tertiary-container)' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  border: m.completed ? 'none' : '2px solid #cbd5e1',
                  background: m.completed ? 'var(--md-sys-color-primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}>
                  {m.completed && <CheckCircle2 size={14} />}
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: m.completed ? '#64748b' : '#0f172a',
                  textDecoration: m.completed ? 'line-through' : 'none'
                }}>
                  {m.title}
                </span>
              </div>

              <span className="md3-chip" style={{ height: '20px', fontSize: '9px', padding: '0 6px', flexShrink: 0 }}>
                {m.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Proactive Scenario Prompt Chips ─────────────────────────── */}
      <div style={{ marginTop: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--md-sys-color-on-primary-container)', display: 'block', marginBottom: '8px' }}>
          One-Tap Tactical Scenarios:
        </span>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {[
            { label: '🚨 Urge Strike', prompt: 'I am experiencing a sudden intense urge right now. Give me a 30-second stoic neurochemical defusal protocol.' },
            { label: '⚡ Friction / Delay', prompt: 'I am procrastinating on my most important freelance task. Break it into an immediate 2-minute physical start.' },
            { label: '💼 Client Poise', prompt: 'Give me high-altitude psychological confidence for freelance price negotiation in INR.' },
            { label: '🌙 Evening Shutdown', prompt: 'Help me disconnect mentally from all work stress and transition into deep restorative sleep.' }
          ].map((sc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(sc.prompt);
                handleAskCoach(sc.prompt);
              }}
              className="ref-filter-pill"
              style={{ height: '32px', fontSize: '11px', padding: '0 12px' }}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Interactive Ask Warrior Coach Input ─────────────────────── */}
      <div style={{ marginTop: '12px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskCoach();
          }}
          style={{ display: 'flex', gap: '8px' }}
        >
          <input
            type="text"
            placeholder="Ask warrior coach anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="md3-field-outlined"
            style={{ height: '42px', padding: '0 16px', fontSize: '13px', flex: 1, borderRadius: '9999px' }}
          />
          <button
            type="submit"
            disabled={askingCoach}
            className="ref-circle-btn ref-circle-btn-dark"
            style={{ width: '42px', height: '42px', flexShrink: 0 }}
          >
            {askingCoach ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>

        {coachResponse && (
          <div style={{
            marginTop: '12px',
            padding: '16px',
            background: '#ffffff',
            borderRadius: '20px',
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--md-sys-color-on-surface)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            whiteSpace: 'pre-line'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--md-sys-color-primary)', textTransform: 'uppercase' }}>
                🦅 Gemini Warrior Coach Protocol:
              </span>
              <button
                type="button"
                onClick={() => setCoachResponse(null)}
                style={{ background: 'none', border: 'none', fontSize: '11px', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}
              >
                Close
              </button>
            </div>
            {coachResponse}
          </div>
        )}
      </div>

      {/* ── API Key Configuration Scrim Modal ──────────────────────── */}
      {showKeyModal && (
        <div className="md3-scrim" onClick={() => setShowKeyModal(false)}>
          <div className="md3-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={20} color="var(--md-sys-color-primary)" />
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Gemini API Settings</h3>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.4 }}>
              Enter your Google AI Studio Gemini API Key for live real-time LLM reasoning. (Leave blank to use the built-in offline knowledge reasoning engine).
            </p>

            <form onSubmit={handleSaveApiKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="md3-field-outlined"
                style={{ fontFamily: 'monospace' }}
              />

              {keySaved && (
                <div style={{ fontSize: '12px', color: 'var(--md-sys-color-tertiary)', fontWeight: 700 }}>
                  ✓ API Key configuration saved!
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="md3-button-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="md3-button-filled"
                >
                  Save Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
