/**
 * IncomeView.tsx — Freelance Forge & Monetary Velocity
 *
 * Implements pure Material Design 3 (material.io) layout paradigms:
 *   1. Prominent Income Hero Container in INR (₹) format with EWMA statistical forecast
 *   2. Velocity metric cards (Proposal win rate & Daily run rate)
 *   3. Grouped Transaction History Ledger in an M3 List Container
 *   4. Add Income Entry Dialog with clean M3 Outlined Text Fields
 *
 * Calculates 95% confidence intervals and daily required pace via forecastEngine.
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  Trash2,
  Briefcase,
  Layers,
  CheckCircle2,
  Target,
  X,
  Calculator,
  IndianRupee
} from 'lucide-react';
import { IncomeEntry, IncomeSource, UserProfile } from '../../types';
import { db } from '../../services/db';
import { formatINR, calculateIncomeForecast } from '../../services/forecastEngine';

/**
 * Renders the Material Design 3 Freelance Income dashboard.
 */
export const IncomeView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [entries, setEntries] = useState<IncomeEntry[]>(db.getIncomeEntries());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  /* ── Add Income form state ───────────────────────────────────────── */
  const [amount, setAmount] = useState<string>('25000');
  const [clientName, setClientName] = useState<string>('');
  const [source, setSource] = useState<IncomeSource>('Direct Client');
  const [description, setDescription] = useState<string>('');

  /** Subscribes to database changes. */
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getProfile());
      setEntries(db.getIncomeEntries());
    });
    return () => unsub();
  }, []);

  /** Computes the EWMA forecast. */
  const forecast = calculateIncomeForecast(entries, profile.targetMonthlyIncome);

  /** Validates and logs a new freelance payment in INR (₹). */
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    db.addIncomeEntry({
      amount: numAmount,
      currency: 'INR',
      source,
      clientName: clientName || 'Undisclosed Client',
      projectDescription: description || 'Freelance project milestone delivery',
      isPaid: true,
    });

    setIsAddModalOpen(false);
    setAmount('25000');
    setClientName('');
    setDescription('');
  };

  /** Deletes an income transaction by ID. */
  const handleDelete = (id: string) => {
    db.deleteIncomeEntry(id);
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
              Freelance Forge
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              {profile.displayName || 'Sovereign Warrior'}
            </div>
          </div>
        </div>

        <div className="ref-header-actions">
          <button
            className="ref-circle-btn ref-circle-btn-dark"
            onClick={() => setIsAddModalOpen(true)}
            title="Log Freelance Income"
            aria-label="Log income"
          >
            <Plus size={18} />
          </button>
          <div className="ref-circle-btn ref-circle-btn-light" title="Notifications">
            <span style={{ fontSize: '14px' }}>₹</span>
            <div className="ref-badge-dot" />
          </div>
        </div>
      </div>

      {/* ── Page Title ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 className="ref-page-title" style={{ margin: 0 }}>
          Monetary Velocity
        </h1>
        <div className="md3-chip md3-chip-filled" style={{ fontSize: '11px', fontWeight: 800 }}>
          Goal: {formatINR(profile.targetMonthlyIncome)}
        </div>
      </div>

      {/* ── Hero Income Card (M3 Tinted Container) ─────────────────── */}
      <div className="ref-task-card ref-task-card-tinted" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Month Realized
            </span>
            <div style={{
              fontSize: '36px',
              fontWeight: 800,
              fontFamily: 'var(--md-sys-typescale-display-large-font)',
              letterSpacing: '-1px',
              marginTop: '2px'
            }}>
              {formatINR(forecast.currentMonthTotal)}
            </div>
          </div>
          <div className="md3-chip md3-chip-filled" style={{ fontSize: '11px' }}>
            <Target size={13} />
            Goal: {formatINR(profile.targetMonthlyIncome)}
          </div>
        </div>

        {/* Monthly Target Pace Progress */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
            <span>Target Pace: <strong>{forecast.targetProgressPercent}%</strong></span>
            <span>{forecast.daysRemaining} days remaining in month</span>
          </div>
          <div className="md3-progress-track" style={{ height: '6px', background: 'rgba(0, 0, 0, 0.1)' }}>
            <div 
              className="md3-progress-indicator" 
              style={{ 
                width: `${Math.min(100, forecast.targetProgressPercent)}%`,
                background: 'var(--md-sys-color-on-primary-container)'
              }} 
            />
          </div>
        </div>

        {/* EWMA Forecast Box (Filled Surface) */}
        <div style={{
          marginTop: '16px',
          padding: '14px',
          background: 'var(--md-sys-color-surface-container-lowest)',
          borderRadius: 'var(--md-sys-shape-medium)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--md-sys-color-on-surface)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
              <TrendingUp size={14} />
              EWMA Forecast (EOM Projection):
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--md-sys-typescale-headline-large-font)', marginTop: '2px' }}>
              {formatINR(forecast.projectedMonthTotal)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
              95% Band: {formatINR(forecast.rangeLow)} – {formatINR(forecast.rangeHigh)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="md3-chip md3-chip-filled" style={{ height: '22px', fontSize: '10px', fontWeight: 800 }}>
              {forecast.projectedTargetStatus.toUpperCase()}
            </span>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px' }}>
              Req: <strong>{formatINR(forecast.dailyTargetRequired)}/day</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metric Grid ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="md3-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Briefcase size={15} color="var(--md-sys-color-primary)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Proposal Win Rate
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)', marginTop: '4px' }}>
            28.5% Closed
          </div>
          <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
            4 Won / 14 Sent
          </div>
        </div>

        <div className="md3-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calculator size={15} color="var(--md-sys-color-primary)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Daily Run Rate
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--md-sys-color-primary)', marginTop: '4px' }}>
            {formatINR(forecast.dailyAverage)}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
            Weighted 30-day average
          </div>
        </div>
      </div>

      {/* ── Transaction History (Grouped List Container) ───────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} color="var(--md-sys-color-primary)" />
            <h2 style={{
              fontFamily: 'var(--md-sys-typescale-title-medium-font)',
              fontSize: 'var(--md-sys-typescale-title-medium-size)',
              fontWeight: 700,
              color: 'var(--md-sys-color-on-surface)'
            }}>
              Recent Income Ledger
            </h2>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
            {entries.length} Transactions
          </span>
        </div>

        <div className="md3-list-group">
          {entries.map((entry) => (
            <div key={entry.id} className="md3-list-group-item" style={{ cursor: 'default' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--md-sys-color-on-surface)' }}>
                    {entry.clientName}
                  </span>
                  <span className="md3-chip md3-chip-filled" style={{ height: '18px', padding: '0 6px', fontSize: '9px', fontWeight: 700 }}>
                    {entry.source}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                  {entry.projectDescription} · {new Date(entry.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--md-sys-color-primary)',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  +{formatINR(entry.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-outline-variant)', cursor: 'pointer', padding: '4px' }}
                  title="Delete entry"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add Income Modal Dialog ────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="md3-scrim" role="dialog" aria-modal="true">
          <div className="md3-dialog">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IndianRupee size={18} color="var(--md-sys-color-primary)" />
                <h3 style={{
                  fontFamily: 'var(--md-sys-typescale-title-large-font)',
                  fontSize: 'var(--md-sys-typescale-title-large-size)',
                  fontWeight: 700
                }}>
                  Log Freelance Income (₹)
                </h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEntry} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="md3-field-label">Amount in INR (₹):</label>
                <input
                  type="number"
                  required
                  className="md3-field-outlined"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 25000"
                  style={{ fontSize: '16px', fontWeight: 800 }}
                />
              </div>

              <div>
                <label className="md3-field-label">Client / Project Name:</label>
                <input
                  type="text"
                  required
                  className="md3-field-outlined"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Zenith Media Tech"
                />
              </div>

              <div>
                <label className="md3-field-label">Income Source:</label>
                <select
                  className="md3-select"
                  value={source}
                  onChange={(e) => setSource(e.target.value as IncomeSource)}
                >
                  <option value="Direct Client">Direct Client</option>
                  <option value="Upwork">Upwork</option>
                  <option value="Fiverr">Fiverr</option>
                  <option value="Retainer">Monthly Retainer</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="md3-field-label">Scope / Milestone Description:</label>
                <input
                  type="text"
                  className="md3-field-outlined"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Completed frontend dashboard milestone"
                />
              </div>

              <button type="submit" className="md3-button-filled" style={{ marginTop: '8px' }}>
                <CheckCircle2 size={16} />
                Save Income (+100 XP)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
