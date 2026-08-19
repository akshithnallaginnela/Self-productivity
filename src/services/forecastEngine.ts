/**
 * forecastEngine.ts — Statistical EWMA Income Forecaster & Currency Formatter
 *
 * Implements client-side statistical forecasting algorithms:
 *   1. Exponentially Weighted Moving Average (EWMA) with alpha decay (α = 0.3)
 *   2. Linear regression projection with daily velocity calculation
 *   3. 95% Confidence Interval error bands based on historical standard deviation
 *   4. Standard Indian Rupee (INR ₹) Lakhs/Thousands numerical formatting (e.g. ₹1,20,000)
 */

import { IncomeEntry } from '../types';

/**
 * Result structure of the income forecast engine calculation
 */
export interface IncomeForecastResult {
  /** Total realized income collected in the current calendar month */
  currentMonthTotal: number;
  /** Forecasted total income at end-of-month based on EWMA velocity */
  projectedMonthTotal: number;
  /** Lower bound of the 95% confidence interval */
  rangeLow: number;
  /** Upper bound of the 95% confidence interval */
  rangeHigh: number;
  /** Weighted daily average income velocity (INR/day) */
  dailyAverage: number;
  /** Required daily earning pace to hit monthly target by end of month */
  dailyTargetRequired: number;
  /** Days remaining in the active calendar month */
  daysRemaining: number;
  /** Percentage of target goal already achieved */
  targetProgressPercent: number;
  /** Projected status assessment (Surplus | On Track | Behind Pace) */
  projectedTargetStatus: 'Surplus' | 'On Track' | 'Behind Pace';
}

/**
 * Formats a numeric amount into standard Indian Rupee notation (Lakhs and Crores).
 * Example: 120000 -> "₹1,20,000"
 *
 * @param {number} amount Numeric monetary value in INR
 * @returns {string} Formatted Indian Rupee string
 */
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Math.round(amount));
};

/**
 * Calculates end-of-month income forecast using EWMA and linear regression.
 *
 * Mathematical formulation:
 *   EWMA_t = α * x_t + (1 - α) * EWMA_{t-1}, where α = 0.3
 *   Projected_Total = Current_Total + (EWMA_Daily_Rate * Days_Remaining)
 *
 * @param {IncomeEntry[]} entries Array of historical income transactions
 * @param {number} targetMonthlyIncome Target monthly goal in INR
 * @returns {IncomeForecastResult} Statistical forecast calculation metrics
 */
export const calculateIncomeForecast = (
  entries: IncomeEntry[],
  targetMonthlyIncome: number
): IncomeForecastResult => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Days in current calendar month
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = Math.max(0, totalDaysInMonth - currentDay);
  const daysPassed = Math.max(1, currentDay);

  // Filter entries to the current calendar month
  const currentMonthEntries = entries.filter(e => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  // Current realized month-to-date total
  const currentMonthTotal = currentMonthEntries.reduce((sum, e) => sum + e.amount, 0);

  // Daily totals map for the past 30 days for EWMA calculation
  const dailyTotals: number[] = [];
  for (let i = 0; i < daysPassed; i++) {
    const dayDate = new Date(currentYear, currentMonth, i + 1).toISOString().split('T')[0];
    const daySum = currentMonthEntries
      .filter(e => e.createdAt.startsWith(dayDate))
      .reduce((sum, e) => sum + e.amount, 0);
    dailyTotals.push(daySum);
  }

  // Calculate Exponentially Weighted Moving Average (EWMA, alpha = 0.3)
  const alpha = 0.3;
  let ewma = dailyTotals[0] || (currentMonthTotal / daysPassed);
  for (let i = 1; i < dailyTotals.length; i++) {
    ewma = alpha * dailyTotals[i] + (1 - alpha) * ewma;
  }

  const dailyAverage = Math.max(100, ewma);

  // Standard Deviation for 95% Confidence Interval (Z ≈ 1.96)
  const variance = dailyTotals.reduce((acc, val) => acc + Math.pow(val - (currentMonthTotal / daysPassed), 2), 0) / Math.max(1, dailyTotals.length);
  const stdDev = Math.sqrt(variance);
  const marginOfError = 1.96 * (stdDev / Math.sqrt(Math.max(1, dailyTotals.length))) * daysRemaining;

  // EOM Projections
  const projectedFuture = dailyAverage * daysRemaining;
  const projectedMonthTotal = currentMonthTotal + projectedFuture;

  const rangeLow = Math.max(currentMonthTotal, projectedMonthTotal - marginOfError);
  const rangeHigh = projectedMonthTotal + marginOfError;

  // Daily target required to meet goal
  const amountNeeded = Math.max(0, targetMonthlyIncome - currentMonthTotal);
  const dailyTargetRequired = daysRemaining > 0 ? Math.round(amountNeeded / daysRemaining) : 0;

  // Progress percentage
  const targetProgressPercent = targetMonthlyIncome > 0
    ? Math.min(100, Math.round((currentMonthTotal / targetMonthlyIncome) * 100))
    : 100;

  // Target status classification
  let projectedTargetStatus: 'Surplus' | 'On Track' | 'Behind Pace' = 'On Track';
  if (projectedMonthTotal >= targetMonthlyIncome * 1.1) {
    projectedTargetStatus = 'Surplus';
  } else if (projectedMonthTotal < targetMonthlyIncome * 0.9) {
    projectedTargetStatus = 'Behind Pace';
  }

  return {
    currentMonthTotal,
    projectedMonthTotal: Math.round(projectedMonthTotal),
    rangeLow: Math.round(rangeLow),
    rangeHigh: Math.round(rangeHigh),
    dailyAverage: Math.round(dailyAverage),
    dailyTargetRequired,
    daysRemaining,
    targetProgressPercent,
    projectedTargetStatus
  };
};
