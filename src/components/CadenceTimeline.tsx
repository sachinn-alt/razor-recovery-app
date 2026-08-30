import React, { useState } from 'react';
import type { DripStep, Transaction } from '../types';

interface CadenceTimelineProps {
  transaction: Transaction;
  onSimulateRecovery?: (txId: string) => void;
}

export const CadenceTimeline: React.FC<CadenceTimelineProps> = ({
  transaction,
  onSimulateRecovery,
}) => {
  const [steps, setSteps] = useState<DripStep[]>([
    {
      id: 'cad_1',
      transactionId: transaction.id,
      stepNumber: 1,
      offsetMinutes: 0,
      channel: 'In-App',
      title: 'T+0m: Instant 1-Click Fallback Bottom Sheet',
      messagePreview: 'Detects 3DS card friction & prompts instant 1-tap UPI switch on checkout screen.',
      status: transaction.status === 'Recovered' ? 'cancelled_paid' : 'delivered',
      scheduledTime: 'Immediate (T+0 min)',
      executedAt: '0.2s after failure',
      discountOffered: 0
    },
    {
      id: 'cad_2',
      transactionId: transaction.id,
      stepNumber: 2,
      offsetMinutes: 5,
      channel: 'WhatsApp',
      title: 'T+5m: WhatsApp AI Conversational Recovery Nudge',
      messagePreview: `Hi ${transaction.customerName}, your payment was interrupted. Complete checkout in 1 tap with reserved cart: /pay/${transaction.id}`,
      status: transaction.status === 'Recovered' ? 'cancelled_paid' : 'sent',
      scheduledTime: 'T+5 minutes',
      executedAt: '5m after failure',
      discountOffered: 5
    },
    {
      id: 'cad_3',
      transactionId: transaction.id,
      stepNumber: 3,
      offsetMinutes: 30,
      channel: 'SMS',
      title: 'T+30m: Transactional SMS Fallback',
      messagePreview: `Alert: Your cart reservation for ₹${transaction.amount} expires in 15m. Secure link: /pay/${transaction.id}`,
      status: transaction.status === 'Recovered' ? 'cancelled_paid' : 'pending',
      scheduledTime: 'T+30 minutes',
      executedAt: undefined,
      discountOffered: 5
    },
    {
      id: 'cad_4',
      transactionId: transaction.id,
      stepNumber: 4,
      offsetMinutes: 1440,
      channel: 'Email',
      title: 'T+24h: Final Cart Expiry Notice & 10% Voucher Escalation',
      messagePreview: `Subject: Last Chance: Cart Expiration Warning for Order #${transaction.id.slice(-4)}. 10% discount applied.`,
      status: transaction.status === 'Recovered' ? 'cancelled_paid' : 'pending',
      scheduledTime: 'T+24 hours',
      executedAt: undefined,
      discountOffered: 10
    }
  ]);

  const handleSimulatePayment = () => {
    setSteps(prev =>
      prev.map(s => (s.status === 'pending' || s.status === 'sent' ? { ...s, status: 'cancelled_paid' } : s))
    );
    if (onSimulateRecovery) {
      onSimulateRecovery(transaction.id);
    }
  };

  const getStatusBadge = (status: DripStep['status']) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="cadence-badge delivered">
            <i className="fa-solid fa-check" style={{ marginRight: '4px' }} />
            Delivered
          </span>
        );
      case 'sent':
        return (
          <span className="cadence-badge sent">
            <i className="fa-solid fa-paper-plane" style={{ marginRight: '4px' }} />
            Sent
          </span>
        );
      case 'pending':
        return (
          <span className="cadence-badge pending">
            <i className="fa-solid fa-clock" style={{ marginRight: '4px' }} />
            Scheduled
          </span>
        );
      case 'cancelled_paid':
        return (
          <span className="cadence-badge cancelled">
            <i className="fa-solid fa-ban" style={{ marginRight: '4px' }} />
            Auto-Cancelled (Customer Paid)
          </span>
        );
      default:
        return <span className="cadence-badge">{status}</span>;
    }
  };

  const getChannelIconClass = (channel: DripStep['channel']) => {
    switch (channel) {
      case 'In-App':
        return 'fa-solid fa-mobile-screen-button';
      case 'WhatsApp':
        return 'fa-brands fa-whatsapp';
      case 'SMS':
        return 'fa-solid fa-comment-sms';
      case 'Email':
        return 'fa-solid fa-envelope';
      default:
        return 'fa-solid fa-bell';
    }
  };

  return (
    <div className="cadence-timeline-card glass-panel">
      <div className="cadence-header">
        <div className="cadence-title-group">
          <div className="cadence-icon">
            <i className="fa-solid fa-timeline text-primary" />
          </div>
          <div>
            <h4 className="cadence-heading">Multi-Touch Drip Cadence Sequence</h4>
            <p className="cadence-sub">
              Targeted time-decayed recovery stages for Transaction <code>{transaction.id}</code> (₹{transaction.amount})
            </p>
          </div>
        </div>

        {transaction.status !== 'Recovered' && (
          <button className="btn-auto-cancel-test" onClick={handleSimulatePayment}>
            <i className="fa-solid fa-bolt" style={{ marginRight: '6px' }} />
            Simulate 1-Tap Recovery (Test Auto-Cancellation)
          </button>
        )}
      </div>

      <div className="cadence-stepper">
        {steps.map((step, idx) => (
          <div key={step.id} className={`cadence-step-item ${step.status}`}>
            <div className="step-left">
              <div className={`step-circle ${step.status}`}>
                {step.status === 'cancelled_paid' ? (
                  <i className="fa-solid fa-xmark" />
                ) : (
                  step.stepNumber
                )}
              </div>
              {idx < steps.length - 1 && <div className={`step-line ${step.status}`} />}
            </div>

            <div className="step-content">
              <div className="step-meta-row">
                <div className="step-channel-tag">
                  <i className={getChannelIconClass(step.channel)} style={{ color: 'var(--color-primary)' }} />
                  <strong>{step.channel}</strong>
                  <span className="step-time">({step.scheduledTime})</span>
                </div>
                {getStatusBadge(step.status)}
              </div>

              <h5 className="step-title">{step.title}</h5>
              <div className="step-preview-bubble">
                <span className="quote-mark">“</span>
                {step.messagePreview}
                <span className="quote-mark">”</span>
              </div>

              {step.discountOffered && step.discountOffered > 0 ? (
                <div className="step-incentive">
                  <i className="fa-solid fa-tag" style={{ marginRight: '4px' }} />
                  Incentivized with <strong>{step.discountOffered}% Discount Cap</strong>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
