/**
 * MindsetView.tsx — Mindset Sanctuary & Archetype Resonance
 *
 * Implements pure Material Design 3 (material.io) layout paradigms:
 *   1. M3 Segmented Button for instant Archetype selection (Eagle / Wolf / Tiger)
 *   2. Procedural Web Audio soundscape cards with live FFT waveform frequency visualizer
 *   3. Warrior Reflection Journal with local NLP sentiment scoring
 *   4. Grouped Past Reflections List
 *
 * All audio synthesis is computed in real-time in-browser via Web Audio API (0 external assets).
 */

import React, { useState, useEffect } from 'react';
import { Play, Square, Volume2, BookOpen, Send, Compass, Sparkles } from 'lucide-react';
import { Archetype, JournalEntry, UserProfile } from '../../types';
import { db } from '../../services/db';
import { audioEngine, SOUNDSCAPE_TRACKS } from '../../services/audioEngine';

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

/**
 * Renders the Material Design 3 Mindset Sanctuary.
 */
export const MindsetView: React.FC = () => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="md3-section-title">Mindset Sanctuary</span>
          <h1 className="md3-headline">Archetype Resonance</h1>
        </div>
        <div className="md3-chip md3-chip-filled">
          {profile.selectedArchetype} Archetype
        </div>
      </div>

      {/* ── M3 Segmented Button Archetype Switcher ─────────────────── */}
      <div className="md3-card" style={{ padding: '12px 14px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
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

      {/* ── Soundscape Synthesizer Card (M3 Tinted Container) ──────── */}
      <div className="md3-card-tinted" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Volume2 size={18} />
            <div>
              <h2 style={{
                fontFamily: 'var(--md-sys-typescale-title-medium-font)',
                fontSize: 'var(--md-sys-typescale-title-medium-size)',
                fontWeight: 700
              }}>
                Web Audio Soundscapes
              </h2>
              <p style={{ fontSize: '11px', opacity: 0.85 }}>
                Procedurally synthesized in-browser · 100% free & offline
              </p>
            </div>
          </div>

          {/* Live Waveform Bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '22px' }}>
            {visualizerData.map((h, i) => (
              <div
                key={i}
                style={{
                  width: '3px',
                  height: `${h}px`,
                  background: isPlaying ? 'var(--md-sys-color-on-primary-container)' : 'rgba(0, 0, 0, 0.15)',
                  borderRadius: '2px',
                  transition: 'height 0.1s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Track List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          {SOUNDSCAPE_TRACKS.map((track) => {
            const isThisPlaying = isPlaying && activeTrackId === track.id;
            return (
              <div
                key={track.id}
                onClick={() => handleToggleTrack(track.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--md-sys-shape-medium)',
                  background: isThisPlaying ? 'var(--md-sys-color-surface-container-lowest)' : 'rgba(255, 255, 255, 0.35)',
                  color: isThisPlaying ? 'var(--md-sys-color-on-surface)' : 'inherit',
                  cursor: 'pointer',
                  border: isThisPlaying ? '1px solid var(--md-sys-color-primary)' : '1px solid rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>
                      {track.name}
                    </span>
                    <span style={{ fontSize: '10px', opacity: 0.75 }}>
                      [{track.frequency}]
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                    {track.description}
                  </div>
                </div>

                <button
                  type="button"
                  className={isThisPlaying ? 'md3-button-filled' : 'md3-button-tonal'}
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: 'var(--md-sys-shape-full)', flexShrink: 0 }}
                  aria-label={isThisPlaying ? 'Stop track' : 'Play track'}
                >
                  {isThisPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Reflection Journal Card (M3 Surface Card) ──────────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={16} color="var(--md-sys-color-primary)" />
            <h2 style={{
              fontFamily: 'var(--md-sys-typescale-title-medium-font)',
              fontSize: 'var(--md-sys-typescale-title-medium-size)',
              fontWeight: 700,
              color: 'var(--md-sys-color-on-surface)'
            }}>
              Warrior Reflection Journal
            </h2>
          </div>
          <button
            type="button"
            className="md3-button-text md3-button-sm"
            onClick={handleNewPrompt}
          >
            <Compass size={12} />
            New Prompt
          </button>
        </div>

        <form onSubmit={handleSaveJournal} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Dynamic Introspective Prompt Box */}
          <div style={{
            background: 'var(--md-sys-color-surface-container)',
            borderLeft: '3px solid var(--md-sys-color-primary)',
            padding: '10px 12px',
            borderRadius: '0 var(--md-sys-shape-small) var(--md-sys-shape-small) 0',
            fontSize: '12px',
            fontStyle: 'italic',
            fontWeight: 600,
            color: 'var(--md-sys-color-on-surface)'
          }}>
            "{currentPrompt}"
          </div>

          <textarea
            required
            rows={3}
            className="md3-field-outlined"
            value={journalContent}
            onChange={(e) => setJournalContent(e.target.value)}
            placeholder="Write your reflections with total sovereign resolve..."
            style={{ resize: 'none', lineHeight: '1.4' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: journalSaved ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)', fontWeight: 600 }}>
              {journalSaved ? 'Journal entry saved (+75 XP) ✓' : 'Local NLP sentiment analysis included'}
            </span>
            <button type="submit" className="md3-button-filled md3-button-sm">
              <Send size={13} />
              Save Entry
            </button>
          </div>
        </form>

        {/* Grouped Past Journals */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>
            Past Logs ({journals.length})
          </span>
          <div className="md3-list-group">
            {journals.slice(0, 2).map((j) => (
              <div key={j.id} className="md3-list-group-item" style={{ cursor: 'default' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                      {j.date} · [{j.archetype}]
                    </span>
                    <span className="md3-chip md3-chip-filled" style={{ height: '18px', fontSize: '9px', padding: '0 6px' }}>
                      Sentiment: +{(j.sentimentScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface)', marginTop: '4px', lineHeight: '1.4' }}>
                    {j.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
