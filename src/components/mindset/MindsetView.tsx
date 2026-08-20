/**
 * MindsetView.tsx — Mindset Sanctuary, Gemini AI Coach & Archetype Resonance
 *
 * Implements:
 *   1. Gemini AI Warrior Coach directive & interactive chat advisor (GeminiCoachCard)
 *   2. Modern Pill Archetype Switcher (Eagle / Wolf / Tiger)
 *   3. Procedural Web Audio soundscape cards with live FFT waveform frequency visualizer
 *   4. Warrior Reflection Journal with local NLP sentiment scoring
 *   5. Grouped Past Reflections List with sleek borderless card styling
 */

import React, { useState, useEffect } from 'react';
import { Play, Square, Volume2, BookOpen, Send, Sparkles, RefreshCw } from 'lucide-react';
import { Archetype, JournalEntry, UserProfile } from '../../types';
import { db } from '../../services/db';
import { audioEngine, SOUNDSCAPE_TRACKS } from '../../services/audioEngine';
import { GeminiCoachCard } from './GeminiCoachCard';

/** Archetype-specific introspective prompts */
const ARCHETYPE_PROMPTS: Record<Archetype, string[]> = {
  EAGLE: [
    'What storm did I rise above today rather than fighting the turbulence?',
    'What is the single highest-leverage task that will define my week?',
    'Where did I maintain high-altitude vision when small distractions attempted to pull me down?'
  ],
  WOLF: [
    'How did I protect my integrity and respect my pack today?',
    'Where did I demonstrate silent patience instead of impulsive reactivity?',
    'What uncomfortable action did I take today that built internal respect?'
  ],
  TIGER: [
    'Where did I execute with total silence and decisive speed?',
    'What hesitation did I ruthlessly eliminate today?',
    'How did I turn physical stillness into mental power?'
  ]
};

interface MindsetViewProps {
  onOpenNotifications?: () => void;
}

export const MindsetView: React.FC<MindsetViewProps> = ({ onOpenNotifications }) => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [journals, setJournals] = useState<JournalEntry[]>(db.getJournals());
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [visualizerData, setVisualizerData] = useState<number[]>([10, 20, 15, 30, 25, 40, 35, 20]);

  /* ── Journaling state ──────────────────────────────────────────── */
  const [currentPrompt, setCurrentPrompt] = useState<string>(ARCHETYPE_PROMPTS.EAGLE[0]);
  const [journalContent, setJournalContent] = useState<string>('');
  const [journalSaved, setJournalSaved] = useState<boolean>(false);

  /** Subscribes to database and audio engine updates. */
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getProfile());
      setJournals(db.getJournals());
    });

    audioEngine.setCallback((playing, trackId) => {
      setIsPlaying(playing);
      setActiveTrackId(trackId);
    });

    return () => unsub();
  }, []);

  /**
   * Real-time audio waveform visualizer loop.
   */
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (isPlaying) {
        const raw = audioEngine.getVisualizerData();
        setVisualizerData(Array.from(raw.slice(0, 12)).map((v) => Math.max(6, (v / 255) * 30)));
      } else {
        setVisualizerData([5, 8, 6, 10, 8, 6, 5, 4]);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  /** Switches the active archetype and updates the journal prompt. */
  const handleSelectArchetype = (arch: Archetype) => {
    db.setArchetype(arch);
    setCurrentPrompt(ARCHETYPE_PROMPTS[arch][0]);
  };

  /** Toggles track playback. */
  const handleToggleTrack = (trackId: string) => {
    if (isPlaying && activeTrackId === trackId) {
      audioEngine.stop();
    } else {
      audioEngine.playTrack(trackId);
    }
  };

  /** Picks a random introspective prompt. */
  const handleNewPrompt = () => {
    const prompts = ARCHETYPE_PROMPTS[profile.selectedArchetype];
    setCurrentPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
  };

  /** Saves journal entry with local sentiment analysis. */
  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalContent.trim()) return;

    const lower = journalContent.toLowerCase();
    let score = 0.75;
    if (lower.includes('conquered') || lower.includes('victory') || lower.includes('discipline')) score += 0.2;
    if (lower.includes('struggle') || lower.includes('urge') || lower.includes('difficult')) score -= 0.1;
    score = Math.max(0.1, Math.min(1.0, score));

    db.addJournal(currentPrompt, journalContent, Math.round(score * 100) / 100);
    setJournalContent('');
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* ── Reference Top Header Bar ───────────────────────────────── */}
      <div className="ref-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="ref-avatar-btn">
            <span style={{ fontSize: '20px' }}>
              {profile.selectedArchetype === 'WOLF' ? '🐺' : profile.selectedArchetype === 'TIGER' ? '🐅' : '🦅'}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Mindset Sanctuary
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              {profile.displayName || 'Sovereign Warrior'}
            </div>
          </div>
        </div>

        <div className="ref-header-actions">
          <button
            className="ref-circle-btn ref-circle-btn-dark"
            onClick={handleNewPrompt}
            title="Generate New Prompt"
            aria-label="New prompt"
          >
            <Sparkles size={18} />
          </button>
          <button
            className="ref-circle-btn ref-circle-btn-light"
            onClick={onOpenNotifications}
            title="Notification Center"
            aria-label="Open notifications"
          >
            <span style={{ fontSize: '12px', fontWeight: 800 }}>AI</span>
            <div className="ref-badge-dot" />
          </button>
        </div>
      </div>

      {/* ── Page Title ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 className="ref-page-title" style={{ margin: 0 }}>
          Archetype Resonance
        </h1>
        <div className="md3-chip md3-chip-filled" style={{ fontWeight: 800 }}>
          {profile.selectedArchetype} Spirit
        </div>
      </div>

      {/* ── Gemini AI Warrior Coach Section ────────────────────────── */}
      <GeminiCoachCard />

      {/* ── Archetype Switcher Segmented Control ────────────────────── */}
      <div className="md3-card" style={{ padding: '14px 18px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          Select Mindset Archetype:
        </span>
        <div className="md3-segmented-group">
          {([
            { id: 'EAGLE' as Archetype, emoji: '🦅', name: 'Eagle' },
            { id: 'WOLF' as Archetype, emoji: '🐺', name: 'Wolf' },
            { id: 'TIGER' as Archetype, emoji: '🐅', name: 'Tiger' },
          ]).map((item) => {
            const isSelected = profile.selectedArchetype === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleSelectArchetype(item.id)}
                className={`md3-segmented-item ${isSelected ? 'active' : ''}`}
              >
                <span>{item.emoji}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Procedural Soundscape Synthesizer Card ─────────────────── */}
      <div className="md3-card-elevated" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--md-sys-shape-full)',
              background: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Volume2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
                Procedural Soundscapes
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Real-time Web Audio API synthesis · 100% free & offline
              </p>
            </div>
          </div>

          {/* FFT Waveform Visualizer */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '28px', padding: '0 4px' }}>
            {visualizerData.map((val, idx) => (
              <div
                key={idx}
                style={{
                  width: '3px',
                  height: `${val}px`,
                  background: isPlaying ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)',
                  borderRadius: '2px',
                  transition: 'height 0.08s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Soundscape Tracks Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
          {SOUNDSCAPE_TRACKS.map((track) => {
            const isThisPlaying = isPlaying && activeTrackId === track.id;
            return (
              <div
                key={track.id}
                onClick={() => handleToggleTrack(track.id)}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--md-sys-shape-medium)',
                  background: isThisPlaying ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
                  color: isThisPlaying ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: isThisPlaying ? '0 4px 14px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {track.frequency}
                    </span>
                    {isThisPlaying ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '4px' }}>
                    {track.name}
                  </div>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.85, lineHeight: 1.3 }}>
                  {track.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Warrior Reflection Journal Form ────────────────────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="var(--md-sys-color-primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              Warrior Reflection Journal
            </h2>
          </div>
          <button
            type="button"
            onClick={handleNewPrompt}
            className="md3-button-text md3-button-sm"
            style={{ fontSize: '11px', gap: '4px' }}
          >
            <RefreshCw size={12} /> New Prompt
          </button>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.03)',
          padding: '12px 14px',
          borderRadius: 'var(--md-sys-shape-medium)',
          fontSize: '13px',
          fontStyle: 'italic',
          fontWeight: 700,
          marginBottom: '12px',
          color: 'var(--md-sys-color-on-surface)'
        }}>
          "{currentPrompt}"
        </div>

        <form onSubmit={handleSaveJournal} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            rows={3}
            placeholder="Record your daily victory or mental battle..."
            value={journalContent}
            onChange={(e) => setJournalContent(e.target.value)}
            className="md3-field-outlined"
            style={{ resize: 'none', lineHeight: 1.5 }}
          />

          <button
            type="submit"
            className="md3-button-filled md3-button-md"
            style={{ width: '100%', gap: '6px', fontWeight: 800 }}
          >
            <Send size={15} /> Save Reflection (+75 XP)
          </button>

          {journalSaved && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--md-sys-color-tertiary)', textAlign: 'center' }}>
              ✓ Warrior reflection saved!
            </div>
          )}
        </form>

        {/* Recent Journals List */}
        {journals.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              Past Reflections ({journals.length}):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {journals.slice(0, 3).map((j) => (
                <div
                  key={j.id}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--md-sys-shape-medium)',
                    background: 'var(--md-sys-color-surface-container)',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '10px', fontWeight: 700 }}>
                    <span>{j.date} · {j.archetype}</span>
                    <span>Sentiment: {Math.round(j.sentimentScore * 100)}% Clarity</span>
                  </div>
                  <div style={{ marginTop: '4px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                    {j.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
