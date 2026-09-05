import React, { useState } from 'react';
import type { Transaction } from '../types';

interface FailureRootCauseMatrixProps {
  transactions: Transaction[];
  onFilterByReason?: (failureType: string) => void;
}

interface CauseMetric {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  count: number;
  amount: number;
  recoveredCount: number;
  recoveredAmount: number;
  recoveryRate: number;
  percentageOfTotal: number;
  recommendedFix: string;
}

export const FailureRootCauseMatrix: React.FC<FailureRootCauseMatrixProps> = ({
  transactions,
  onFilterByReason,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Group transactions by failure categories
  const categoriesDef = [
    {
      id: 'network_timeout',
      matches: (tx: Transaction) => tx.failureType === 'network_timeout' || tx.initialErrorCode?.includes('TIMEOUT') || tx.initialErrorCode?.includes('GATEWAY'),
      label: 'Bank Timeout & Network Drops',
      shortLabel: 'Bank Timeout',
      icon: 'fa-solid fa-server',
      color: '#305EFF', // Razorpay Blue
      recommendedFix: '1-Click UPI Intent Fallback'
    },
    {
      id: 'authentication_failed',
      matches: (tx: Transaction) => tx.failureType === 'authentication_failed' || tx.failureType === 'checkout_abandoned' || tx.initialErrorCode?.includes('AUTH') || tx.initialErrorCode?.includes('ABANDONED'),
      label: '3DS OTP & Auth Abandonment',
      shortLabel: '3DS / OTP Drop',
      icon: 'fa-solid fa-fingerprint',
      color: '#0EA5E9', // Sky Blue
      recommendedFix: 'WhatsApp Magic OTP Link'
    },
    {
      id: 'insufficient_funds',
      matches: (tx: Transaction) => tx.failureType === 'card_declined_insufficient_funds' || tx.initialErrorCode?.includes('INSUFFICIENT'),
      label: 'Insufficient Funds / Card Limits',
      shortLabel: 'Insufficient Funds',
      icon: 'fa-solid fa-credit-card',
      color: '#D97706', // Amber
      recommendedFix: 'Pay-Later & Split Payment Nudge'
    },
    {
      id: 'invoice_overdue',
      matches: (tx: Transaction) => tx.failureType?.startsWith('invoice_overdue') || tx.initialErrorCode?.includes('INVOICE'),
      label: 'B2B Overdue & Net Term Invoices',
      shortLabel: 'B2B Invoices',
      icon: 'fa-solid fa-file-invoice-dollar',
      color: '#012652', // Prussian Blue
      recommendedFix: 'Automated Drip Email & PTP Agreement'
    },
    {
      id: 'mandate_failed',
      matches: (tx: Transaction) => tx.failureType === 'mandate_registration_failed' || tx.initialErrorCode?.includes('MANDATE'),
      label: 'Recurring Mandate & Subscriptions',
      shortLabel: 'Mandate Failure',
      icon: 'fa-solid fa-repeat',
      color: '#8B5CF6', // Purple
      recommendedFix: 'UPI AutoPay Token Switch'
    },
  ];

  const totalTxCount = transactions.length || 1;

  const metrics: CauseMetric[] = categoriesDef.map((cat) => {
    const matched = transactions.filter(cat.matches);
    const count = matched.length;
    const amount = matched.reduce((sum, t) => sum + (t.amount || 0), 0);
    const recovered = matched.filter(t => t.status === 'Recovered' || t.status === 'Reconciled');
    const recoveredCount = recovered.length;
    const recoveredAmount = recovered.reduce((sum, t) => sum + (t.amount || 0), 0);
    const recoveryRate = count > 0 ? (recoveredCount / count) * 100 : 0;
    const percentageOfTotal = count > 0 ? (count / totalTxCount) * 100 : 0;

    return {
      id: cat.id,
      label: cat.label,
      shortLabel: cat.shortLabel,
      icon: cat.icon,
      color: cat.color,
      count,
      amount,
      recoveredCount,
      recoveredAmount,
      recoveryRate,
      percentageOfTotal,
      recommendedFix: cat.recommendedFix
    };
  });

  // Calculate SVG Donut Arcs
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const donutSlices = metrics.map((m) => {
    const strokeDasharray = `${(m.percentageOfTotal / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += m.percentageOfTotal;
    return {
      ...m,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const totalRecoveredCount = transactions.filter(t => t.status === 'Recovered' || t.status === 'Reconciled').length;
  const overallRate = totalTxCount > 0 ? ((totalRecoveredCount / totalTxCount) * 100).toFixed(1) : '0.0';

  const formatShortINR = (num: number) => {
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}k`;
    return `₹${num.toFixed(0)}`;
  };

  return (
    <div className="root-cause-matrix-container">
      {/* Visual Analytics Dual Area */}
      <div className="matrix-content-layout">
        
        {/* Left: Donut Radial Gauge */}
        <div className="matrix-donut-col">
          <div className="donut-chart-wrapper" style={{ width: size, height: size, position: 'relative' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {donutSlices.map((slice) => {
                if (slice.count === 0) return null;
                const isHovered = hoveredId === slice.id;
                return (
                  <circle
                    key={slice.id}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    transform={`rotate(-90 ${center} ${center})`}
                    style={{
                      transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                      cursor: 'pointer',
                      filter: isHovered ? 'drop-shadow(0 0 6px rgba(1,38,82,0.3))' : 'none',
                    }}
                    onMouseEnter={() => setHoveredId(slice.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onFilterByReason && onFilterByReason(slice.id)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Info */}
            <div className="donut-center-content">
              <span className="donut-center-val">{transactions.length}</span>
              <span className="donut-center-lbl">INCIDENTS</span>
              <span className="donut-center-rate">{overallRate}% RESCUE</span>
            </div>
          </div>

          <div className="donut-caption">
            <span className="live-pulse-badge">
              <span className="pulse-ping" />
              AI ROOT-CAUSE CLASSIFIER
            </span>
          </div>
        </div>

        {/* Right: Breakdown Progress Meters */}
        <div className="matrix-breakdown-col">
          <div className="cause-bars-list">
            {metrics.map((m) => {
              const isHovered = hoveredId === m.id;
              return (
                <div
                  key={m.id}
                  className={`cause-bar-row ${isHovered ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onFilterByReason && onFilterByReason(m.id)}
                  id={`cause-metric-${m.id}`}
                >
                  <div className="cause-header-line">
                    <div className="cause-title-group">
                      <div className="cause-mini-icon" style={{ color: m.color, backgroundColor: `${m.color}15` }}>
                        <i className={m.icon} />
                      </div>
                      <span className="cause-name" title={m.label}>{m.shortLabel}</span>
                    </div>

                    <div className="cause-stats-group">
                      <span className="cause-val">{formatShortINR(m.amount)}</span>
                      <span className="cause-count-badge">({m.count})</span>
                      <span className={`cause-rate-tag ${m.recoveryRate > 0 ? 'rescued' : 'zero'}`}>
                        {m.recoveryRate > 0 ? `${m.recoveryRate.toFixed(0)}% fixed` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Dual-tone Progress Bar: total share track + recovery filled */}
                  <div className="cause-progress-track">
                    <div
                      className="cause-progress-share"
                      style={{
                        width: `${Math.max(m.percentageOfTotal, m.count > 0 ? 6 : 0)}%`,
                        backgroundColor: m.color,
                      }}
                    />
                    {m.recoveryRate > 0 && (
                      <div
                        className="cause-progress-recovered"
                        style={{
                          width: `${(m.percentageOfTotal * (m.recoveryRate / 100))}%`,
                          backgroundColor: '#16A34A',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Footer Optimizer Strategy Banner */}
      <div className="matrix-footer-banner">
        <div className="footer-tip-item">
          <i className="fa-solid fa-wand-magic-sparkles text-primary" />
          <span>
            <strong>AI Auto-Steering:</strong> Timeout & OTP friction are auto-routed to 1-Click WhatsApp payment links with zero checkout friction.
          </span>
        </div>
      </div>
    </div>
  );
};
