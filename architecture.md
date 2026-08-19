# Recovery Warrior — Complete System Architecture (100% Free & Open-Source Edition)

> A high-performance, mobile-first Android/PWA recovery and productivity tracking system built for addiction recovery, habit formation, and freelance income growth. 100% Free, Zero-Cost, Local-First, and Privacy-Guaranteed.

**Version:** 1.0 (Zero-Cost / Open-Source Stack)  
**Last Updated:** August 19, 2026  
**Author:** Recovery Warrior Core Engineering

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram & Widget Ecosystem](#2-architecture-diagram--widget-ecosystem)
3. [Core Modules](#3-core-modules)
4. [Data Models & Local-First Database](#4-data-models--local-first-database)
5. [API & Event Specification](#5-api--event-specification)
6. [Security, Privacy & Zero-Cost Infrastructure](#6-security-privacy--zero-cost-infrastructure)
7. [100% Free Technology Stack](#7-100-free-technology-stack)
8. [Android & Widget Architecture](#8-android--widget-architecture)
9. [Testing Strategy](#9-testing-strategy)
10. [Monitoring, Offline Sync & Maintenance](#10-monitoring-offline-sync--maintenance)
11. [Appendix](#11-appendix)

---

## 1. System Overview

### 1.1 Purpose Statement
The Recovery Warrior Dashboard is an Android-first, mobile-optimized progressive application designed to help users overcome compulsive pornography/masturbation habits while concurrently building unbreakable discipline, physical vitality, and scalable freelance income through:
- **Sobriety Shield**: Real-time streak tracking, interactive milestone badges, trigger pattern heatmaps, and a 10-second delay Crisis Intervention State Machine with guided breathing tools.
- **Freelance Forge**: Income tracking in Indian Rupee format (₹), proposal conversion metrics, and an exponentially weighted moving average (EWMA) linear regression forecasting engine.
- **Warrior Routines**: Strictly ordered morning and evening checklists, habit chains, deep work timers, and sleep quality rating logs.
- **Mindset Sanctuary**: Daily archetype programming (Eagle 🦅, Wolf 🐺, Tiger 🐅), generative Web Audio ambient meditation soundscapes (432Hz, Binaural Alpha/Theta waves, Rain/White Noise), interactive journaling with local sentiment scoring, and daily wisdom.
- **Android Widget Hub**: Glanceable, interactive home screen and lock screen widgets with instant 1-tap logging and crisis delay triggers.

### 1.2 Core User Stories

| User Story | Priority | Acceptance Criteria |
|------------|----------|---------------------|
| Track sobriety streak & milestones | P0 | Streak increments daily at midnight, milestone rings calculate accurately, instant visual celebration |
| Log daily warrior habits | P0 | Morning/evening checklists with strict sequence validation & streak counters |
| Record freelance income (₹) | P0 | Income stored with client/source tags, formatted in Indian Rupee format (`₹85,000`), weekly aggregates |
| Crisis Intervention / Urge Shield | P0 | 10-second delay countdown, 4-7-8 breathing pacer, urge severity rating, trigger logging |
| Income Forecast Engine | P1 | EWMA + linear regression predicts end-of-month earnings with confidence ranges |
| Archetype & Ambient Meditation | P1 | Zero-cost Web Audio procedural soundscapes (432Hz focus, theta calming, rain), archetype theme morphing |
| Android Home Screen Widgets | P0 | Standalone widget views (Streak, Quick Income, Habit Ring, Crisis Shield, Wisdom) |
| Local-First Export & Backup | P1 | 1-click encrypted JSON and CSV export/import, zero reliance on paid servers |

---

## 2. Architecture Diagram & Widget Ecosystem

### 2.1 High-Level Architecture (Local-First Zero-Cost Stack)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ANDROID & CLIENT PRESENTATION LAYER                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │   Android Native PWA    │  │       Android Widget Simulator       │ │
│  │   (Vite + React + TS)   │  │   (Home Screen & Quick-Action Hub)   │ │
│  │   • Motion UI Physics   │  │   • Streak Widget (2x2 / 4x2)        │ │
│  │   • Glassmorphism Theme │  │   • Crisis Emergency Shield (1x1)    │ │
│  │   • Archetype Engine    │  │   • Habit Progress Ring (2x2)        │ │
│  │   • Web Audio Synth     │  │   • Quick ₹ Income Logger (2x1)      │ │
│  └────────────┬────────────┘  └──────────────────┬───────────────────┘ │
│               │                                  │                     │
│               └─────────────────┬────────────────┘                     │
│                                 │                                       │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────────┐
│                     CORE LOGIC & ENGINE LAYER                           │
├─────────────────────────────────┼───────────────────────────────────────┤
│                                 ▼                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Recovery &   │  │ Income &     │  │ Routine &    │  │ Mindset &    │ │
│  │ Crisis Engine│  │ Forecast ML  │  │ Habit Engine │  │ Audio Synth  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │                 │         │
│         └─────────────────┴────────┬────────┴─────────────────┘         │
│                                    │                                    │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────┐
│                    ZERO-COST LOCAL DATA LAYER                           │
├────────────────────────────────────┼────────────────────────────────────┤
│                                    ▼                                    │
│  ┌────────────────────────┐  ┌───────────────────────┐  ┌─────────────┐ │
│  │ IndexedDB (Dexie / IDB)│  │ LocalStorage Cache    │  │ JSON/CSV    │ │
│  │ (100% Offline Primary) │  │ (Fast Session State)  │  │ File Export │ │
│  └────────────────────────┘  └───────────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Modules

### 3.1 Authentication & Profile Module (100% Free & Local-First)
- **Local Pin & Biometric WebAuthn**: Passwordless local lock screen with SHA-256 PIN hashing + WebAuthn biometric unlock (`navigator.credentials`).
- **Profile Customization**: Local avatar selector, timezone default (`Asia/Kolkata`), monthly target income (`₹1,00,000`).

### 3.2 Recovery & Crisis Shield Module
- **Streak Calculation**: Calculates continuous sober days, longest streak, and milestone unlocks (1, 3, 7, 14, 21, 30, 60, 90, 180, 365 days).
- **Crisis State Machine**:
  1. `NORMAL`: Standard tracking mode.
  2. `CRISIS_ACTIVE`: 10-second deliberate cooling delay + pulsating haptic feedback.
  3. `BREATHING_PACER`: 4-7-8 box breathing animation with audio chimes.
  4. `URGE_DEFUSED`: Log urge intensity (1-10) and trigger without breaking streak (+5 XP).
  5. `CONFIRM_RELAPSE`: Compassionate reset, root cause reflection, emergency motivation message.

### 3.3 Income & Freelance Forge Module
- **Currency Engine**: Native Indian Rupee formatting (`Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`).
- **Proposal & Conversion Tracking**: Logs proposals sent vs. deals won, calculating closing ratios.
- **EWMA Income Forecast**: Exponentially weighted moving average with 95% confidence intervals to predict monthly totals.

### 3.4 Warrior Routine Module
- **Strict Morning Ritual**: 5:30 AM Wake -> Hydrate -> 3km Walk -> Cold Shower -> Journal -> Deep Work.
- **Evening Wind-Down**: Screens Off -> Daily Review -> Lights Out.
- **Habit Chain Validator**: Verifies sequence completion order and awards discipline multiplier points.

### 3.5 Mindset & Archetype Sanctuary
- **Archetype Dynamic Switching**:
  - **Eagle 🦅**: Laser vision, strategic elevation, sovereign gold aesthetics (`#F59E0B`, `#D4AF37`).
  - **Wolf 🐺**: Pack loyalty, resilience, arctic silver/cyan aesthetics (`#38BDF8`, `#94A3B8`).
  - **Tiger 🐅**: Relentless power, explosive focus, crimson/ember aesthetics (`#EF4444`, `#F97316`).
- **Generative Web Audio Soundscapes**:
  - `432Hz Sovereign Focus` (Pure harmonic sine drones with binaural alpha wave beating).
  - `Theta Calm Deep Meditation` (6Hz binaural oscillation with warm pink noise).
  - `Storm of Discipline` (Procedural rain/thunder white noise filter).
- **Interactive Daily Journaling**: Local prompt generator + sentiment scoring algorithm.

---

## 4. Data Models (IndexedDB Schema)

```typescript
export interface UserProfile {
  id: string;
  displayName: string;
  pinHash?: string;
  biometricEnabled: boolean;
  selectedArchetype: 'EAGLE' | 'WOLF' | 'TIGER';
  targetMonthlyIncome: number;
  sobrietyStartDate: string;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}

export interface DailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  sober: boolean;
  relapseTime?: string;
  wakeTime?: string;
  bedTime?: string;
  sleepQualityRating?: number; // 1-5
  walkCompleted: boolean;
  workoutCompleted: boolean;
  deepWorkMinutes: number;
  proposalsSent: number;
  moodRating: number; // 1-10
  urgesExperienced: number;
  urgesResisted: number;
  notes?: string;
  streakAtEndOfDay: number;
}

export interface IncomeEntry {
  id: string;
  amount: number;
  currency: string; // 'INR'
  source: string; // Upwork, Fiverr, Direct Client, Retainer, etc.
  clientName: string;
  projectDescription?: string;
  isPaid: boolean;
  createdAt: string;
}

export interface TriggerLog {
  id: string;
  category: 'EMOTION' | 'LOCATION' | 'APP' | 'TIME' | 'SOCIAL' | 'FATIGUE';
  description: string;
  intensity: number; // 1-10
  resisted: boolean;
  recordedAt: string;
}

export interface RoutineTask {
  id: string;
  name: string;
  category: 'MORNING' | 'EVENING' | 'CUSTOM';
  orderIndex: number;
  durationMinutes: number;
  timeHint: string;
  icon: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  prompt: string;
  content: string;
  sentimentScore: number;
  archetype: 'EAGLE' | 'WOLF' | 'TIGER';
  createdAt: string;
}
```

---

## 5. 100% Free Technology Stack

| Layer | Selected Free Tech | Replacement Justification |
|---|---|---|
| **Mobile & Web UI** | React 18 + Vite + TypeScript | Blazing fast, zero runtime cost, full Android PWA support |
| **Styling & Motion** | Tailored Vanilla CSS3 + Motion CSS + Glassmorphism Tokens | 60 FPS smooth physics, hardware-accelerated animations |
| **Icons & Visuals** | Lucide Icons (Open Source MIT) | 1000+ sleek SVG icons, zero cost, tree-shakable |
| **Local Database** | IndexedDB with custom reactive repository | 100% free, multi-gigabyte local storage, zero monthly fees |
| **Audio Engine** | Web Audio API (Generative Oscillators & Filters) | Zero server hosting needed, zero bandwidth cost, studio-grade sound |
| **Analytics & ML** | Client-Side EWMA & Statistics Engine | 100% privacy, instant client calculation, zero cloud charges |
| **Android Widget** | HTML5/CSS PWA App Badges + Embedded Widget Deck & Quick Glances | Native-feel Android widget experience right on device |
| **Hosting & Deploy** | GitHub Pages / Vercel Free / Netlify Free / Local Offline | 100% free forever hosting with custom domain support |

---

## 6. Android Widget Suite Specification

The application includes an embedded **Android Widget Deck** allowing users to switch between Full App Mode and Standalone Android Widget Glances:
1. **Streak Shield Widget (2x2 & 4x2)**: Displays current streak count, current archetype crest, flame animation, and 1-tap "🛡️ Urge SOS" button.
2. **Habit Ring Widget (2x2)**: Radial progress tracker showing morning/evening routine completion status and next upcoming ritual.
3. **Freelance Forge Widget (2x1)**: Real-time INR (₹) monthly earned tally, proposal goal counter, and daily pace indicator.
4. **Crisis Panic Widget (1x1)**: Dedicated red/amber emergency trigger that launches instant 10-second breath intervention.
5. **Archetype Daily Wisdom Widget (4x1)**: Displays high-impact mindset quotes for Eagle, Wolf, or Tiger.

---

## 7. Testing & Verification

- **Unit Tests**: Streak calculation algorithms, EWMA forecasting mathematics, habit sequence validation.
- **UI Verification**: Mobile viewport emulation (Pixel 8 / Samsung Galaxy S24 / Tablet / Desktop), dark mode contrast, widget responsiveness, audio synthesizer oscillator accuracy.
- **Storage Verification**: IndexedDB write/read benchmarks, export/import JSON data fidelity.

---
*Recovery Warrior Blueprint — Built for Champions.*
