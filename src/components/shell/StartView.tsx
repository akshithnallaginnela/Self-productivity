/**
 * StartView.tsx — Main Start & Launch Onboarding Screen
 *
 * Implements the personalized application launch & onboarding intake:
 *   1. Sovereign Eagle Logo & Brand Hero Presentation
 *   2. Personalized User Profile Information Intake (Akshith):
 *      - Warrior Call-Sign & Identity
 *      - Spirit Mindset Archetype Selection (Eagle / Wolf / Tiger)
 *      - Monthly Freelance Income Goal in INR (₹)
 *      - Sobriety Anchor Start Date & Streak Record
 *      - Core Disciplines Configuration
 *      - Optional 4-Digit Local Privacy Security PIN
 *   3. "Ignite Sovereign System" CTA with triumph chime, haptics & confetti
 */

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Shield,
  Target,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Flame,
  Clock,
  Footprints,
  Moon,
  Sun,
  IndianRupee,
  ShieldCheck
} from 'lucide-react';
import { Archetype, UserProfile } from '../../types';
import { db } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';
import { AppLogo } from './AppLogo';

interface StartViewProps {
  /** Callback fired when user completes intake and enters the dashboard */
  onComplete: () => void;
}

export const StartView: React.FC<StartViewProps> = ({ onComplete }) => {
  const currentProfile = db.getProfile();

  /* ── Form state initialized with Akshith's parameters ───────────── */
  const [displayName, setDisplayName] = useState<string>(currentProfile.displayName || 'Akshith');
  const [archetype, setArchetype] = useState<Archetype>(currentProfile.selectedArchetype || 'EAGLE');
  const [targetIncome, setTargetIncome] = useState<number>(currentProfile.targetMonthlyIncome || 150000);
  const [customIncome, setCustomIncome] = useState<string>(currentProfile.targetMonthlyIncome.toString());
  const [currentStreak, setCurrentStreak] = useState<number>(currentProfile.currentStreak || 21);
  const [pin, setPin] = useState<string>(currentProfile.pin || '');
  const [selectedDisciplines, setSelectedDisciplines] = useState<{ [key: string]: boolean }>({
    wake: true,
    walk: true,
    focus: true,
    sleep: true
  });

  const handleIncomePreset = (amount: number) => {
    setTargetIncome(amount);
    setCustomIncome(amount.toString());
    audioEngine.triggerHaptic('light');
  };

  const handleArchetypeSelect = (arch: Archetype) => {
    setArchetype(arch);
    db.setArchetype(arch);
    audioEngine.triggerHaptic('medium');
  };

  const toggleDiscipline = (key: string) => {
    setSelectedDisciplines((prev) => ({ ...prev, [key]: !prev[key] }));
    audioEngine.triggerHaptic('light');
  };

  const handleIgnite = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedIncome = parseFloat(customIncome);
    const finalIncome = isNaN(parsedIncome) || parsedIncome <= 0 ? 150000 : parsedIncome;

    // Persist completed setup into local database
    db.updateProfile({
      displayName: displayName.trim() || 'Akshith',
      selectedArchetype: archetype,
      targetMonthlyIncome: finalIncome,
      currentStreak: currentStreak > 0 ? currentStreak : 1,
      pin: pin ? pin.trim() : undefined,
      isOnboardingCompleted: true
    });

    db.setArchetype(archetype);

    // Audio & celebratory visual effects
    audioEngine.playMilestoneTriumph();
    audioEngine.triggerHaptic('success');
    confetti({
      particleCount: 75,
      spread: 75,
      origin: { y: 0.5 },
      colors: ['#b45309', '#f59e0b', '#10b981', '#3b82f6']
    });

    onComplete();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', paddingBottom: '24px' }}>
      
      {/* ── Brand Hero Header ──────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '16px 8px 8px 8px' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '8px' }}>
          <AppLogo size={88} variant="badge" animated={true} />
        </div>

        <h1 style={{
          fontFamily: 'var(--md-sys-typescale-display-large-font)',
          fontSize: '28px',
          fontWeight: 900,
          letterSpacing: '-0.5px',
          color: '#0f172a',
          margin: '4px 0 2px 0'
        }}>
          SOVEREIGN EAGLE
        </h1>

        <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', margin: 0 }}>
          Personal Discipline, Sobriety Shield & Monetary Forge
        </p>

        {/* Personalized Dedicated Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--md-sys-color-primary-container)',
          color: 'var(--md-sys-color-on-primary-container)',
          padding: '4px 14px',
          borderRadius: '9999px',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          marginTop: '10px'
        }}>
          <Sparkles size={12} />
          <span>Crafted Exclusively for Akshith</span>
        </div>
      </div>

      {/* ── Personalized Warrior Intake Form ───────────────────────── */}
      <form onSubmit={handleIgnite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* 1. Warrior Identity */}
        <div className="ref-task-card ref-task-card-light" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Shield size={18} color="var(--md-sys-color-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              1. Warrior Identity & Spirit
            </span>
          </div>

          <div>
            <label className="md3-field-label">Warrior Call-Sign / Name:</label>
            <input
              type="text"
              required
              className="md3-field-outlined"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Akshith"
              style={{ fontSize: '15px', fontWeight: 800, borderRadius: '16px' }}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <label className="md3-field-label">Select Spirit Archetype:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'EAGLE' as Archetype, name: 'Eagle', emoji: '🦅', desc: 'High-Altitude' },
                { id: 'WOLF' as Archetype, name: 'Wolf', emoji: '🐺', desc: 'Silent Pack' },
                { id: 'TIGER' as Archetype, name: 'Tiger', emoji: '🐅', desc: 'Savage Speed' }
              ].map((item) => {
                const isSelected = archetype === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleArchetypeSelect(item.id)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '16px',
                      border: isSelected ? '2px solid var(--md-sys-color-primary)' : '1px solid #e2e8f0',
                      background: isSelected ? 'var(--md-sys-color-primary-container)' : '#f8fafc',
                      color: isSelected ? 'var(--md-sys-color-on-primary-container)' : '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '22px' }}>{item.emoji}</span>
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>{item.name}</span>
                    <span style={{ fontSize: '9px', opacity: 0.75 }}>{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Monthly Monetary Forge Target */}
        <div className="ref-task-card ref-task-card-light" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <IndianRupee size={18} color="var(--md-sys-color-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              2. Monthly Income Target (₹)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            {[100000, 150000, 200000].map((amt) => {
              const isSelected = targetIncome === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleIncomePreset(amt)}
                  className={`ref-filter-pill ${isSelected ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center', height: '34px', fontSize: '11px' }}
                >
                  ₹{(amt / 1000).toLocaleString('en-IN')}k/mo
                </button>
              );
            })}
          </div>

          <div>
            <label className="md3-field-label">Custom Target in INR (₹):</label>
            <input
              type="number"
              required
              className="md3-field-outlined"
              value={customIncome}
              onChange={(e) => {
                setCustomIncome(e.target.value);
                const num = parseFloat(e.target.value);
                if (!isNaN(num)) setTargetIncome(num);
              }}
              placeholder="e.g. 150000"
              style={{ fontSize: '16px', fontWeight: 800, borderRadius: '16px' }}
            />
          </div>
        </div>

        {/* 3. Sobriety Anchor & Current Streak */}
        <div className="ref-task-card ref-task-card-tinted" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Flame size={18} color="var(--md-sys-color-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--md-sys-color-on-primary-container)' }}>
              3. Sobriety Shield Anchor
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>
                Current Sobriety Record
              </div>
              <div style={{ fontSize: '10px', opacity: 0.85 }}>
                Days sober prior to today
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="0"
                className="md3-field-outlined"
                value={currentStreak}
                onChange={(e) => setCurrentStreak(parseInt(e.target.value) || 0)}
                style={{ width: '80px', height: '40px', textAlign: 'center', fontSize: '16px', fontWeight: 900, borderRadius: '14px' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 800 }}>Days</span>
            </div>
          </div>
        </div>

        {/* 4. Core Daily Disciplines */}
        <div className="ref-task-card ref-task-card-light" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={18} color="var(--md-sys-color-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              4. Daily Monitored Disciplines
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { key: 'wake', name: '5:30 AM Sovereign Wakeup & Sunlight', icon: <Sun size={15} color="#d97706" /> },
              { key: 'walk', name: '3km Outdoor GPS Walk & Movement', icon: <Footprints size={15} color="#16a34a" /> },
              { key: 'focus', name: '30m Monitored Deep Work (40Hz Gamma)', icon: <Clock size={15} color="#2563eb" /> },
              { key: 'sleep', name: 'Circadian Sleep & Wind-Down Sync', icon: <Moon size={15} color="#4f46e5" /> }
            ].map((item) => {
              const isChecked = selectedDisciplines[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => toggleDiscipline(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '14px',
                    background: isChecked ? 'var(--md-sys-color-primary-container)' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.icon}
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                      {item.name}
                    </span>
                  </div>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    background: isChecked ? 'var(--md-sys-color-primary)' : 'transparent',
                    border: isChecked ? 'none' : '2px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    {isChecked && <CheckCircle2 size={14} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Local Security PIN */}
        <div className="ref-task-card ref-task-card-light" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Lock size={18} color="var(--md-sys-color-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              5. Local Privacy Master PIN (Optional)
            </span>
          </div>

          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
            100% offline client-side security lock for your private data logs.
          </p>

          <input
            type="password"
            maxLength={6}
            className="md3-field-outlined"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="e.g. 1234"
            style={{ fontSize: '16px', letterSpacing: '4px', textAlign: 'center', borderRadius: '16px' }}
          />
        </div>

        {/* ── Ignite Sovereign System CTA Button ─────────────────────── */}
        <button
          type="submit"
          className="md3-button-filled md3-button-lg"
          style={{
            width: '100%',
            height: '56px',
            fontSize: '16px',
            fontWeight: 900,
            letterSpacing: '0.4px',
            boxShadow: '0 8px 24px -4px rgba(180, 83, 9, 0.4)',
            marginTop: '8px'
          }}
        >
          <Sparkles size={20} />
          <span>Ignite Sovereign System 🦅</span>
          <ArrowRight size={20} />
        </button>

      </form>
    </div>
  );
};
