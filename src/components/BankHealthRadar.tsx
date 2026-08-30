import React, { useState } from 'react';
import type { BankHealthItem } from '../types';

interface BankHealthRadarProps {
  onSimulateBankDegrade?: (bankCode: string) => void;
}

export const BankHealthRadar: React.FC<BankHealthRadarProps> = () => {
  const [banks, setBanks] = useState<BankHealthItem[]>([
    {
      code: 'RAZORPAY_UPI',
      name: 'Razorpay Turbo UPI Switch',
      type: 'UPI',
      successRate: 99.4,
      avgLatencyMs: 310,
      status: 'Healthy',
      trend: 'improving',
      recommendation: 'Primary recommended 1-click fallback route.'
    },
    {
      code: 'ICICI_CARDS',
      name: 'ICICI Bank 3DS 2.0 Rails',
      type: 'Cards',
      successRate: 98.2,
      avgLatencyMs: 540,
      status: 'Healthy',
      trend: 'stable',
      recommendation: 'Optimal route for 3D Secure card retries.'
    },
    {
      code: 'SBI_UPI',
      name: 'State Bank of India (UPI Node)',
      type: 'UPI',
      successRate: 94.8,
      avgLatencyMs: 820,
      status: 'Healthy',
      trend: 'stable',
      recommendation: 'Reliable fallback for SBI customer VPAs.'
    },
    {
      code: 'HDFC_NB',
      name: 'HDFC Netbanking Gateway',
      type: 'Netbanking',
      successRate: 71.4,
      avgLatencyMs: 3850,
      status: 'Degraded',
      trend: 'degrading',
      recommendation: 'Elevated OTP latency. Auto-steering customers to 1-click UPI Intent.'
    },
    {
      code: 'AXIS_NB',
      name: 'Axis Bank Netbanking',
      type: 'Netbanking',
      successRate: 82.5,
      avgLatencyMs: 2100,
      status: 'Degraded',
      trend: 'stable',
      recommendation: 'Moderate latency during evening settlement peaks.'
    }
  ]);

  const toggleDegrade = (code: string) => {
    setBanks(prev =>
      prev.map(b => {
        if (b.code === code) {
          const isHealthy = b.status === 'Healthy';
          return {
            ...b,
            status: isHealthy ? 'Degraded' : 'Healthy',
            successRate: isHealthy ? 64.2 : 98.6,
            avgLatencyMs: isHealthy ? 4200 : 450,
            trend: isHealthy ? 'degrading' : 'improving',
            recommendation: isHealthy
              ? 'Outage detected. Smart routing is now bypassing this rail.'
              : 'Switch operating normally with high throughput.'
          };
        }
        return b;
      })
    );
  };

  return (
    <div className="bank-health-card glass-panel">
      <div className="radar-header">
        <div className="radar-title-group">
          <div className="radar-pulse-dot" />
          <div>
            <h4 className="radar-heading">Real-Time Bank Outage & Downstream Health Radar</h4>
            <p className="radar-sub">Live telemetry feed monitoring issuer switches & gateway success rates</p>
          </div>
        </div>
        <div className="radar-badge">
          <i className="fa-solid fa-bolt" style={{ marginRight: '6px' }} />
          Active Optimizer Steering
        </div>
      </div>

      <div className="bank-grid">
        {banks.map(bank => (
          <div key={bank.code} className={`bank-card ${bank.status.toLowerCase()}`}>
            <div className="bank-card-top">
              <div>
                <div className="bank-type-pill">{bank.type}</div>
                <h5 className="bank-name">{bank.name}</h5>
              </div>
              <span className={`status-pill ${bank.status.toLowerCase()}`}>
                <i
                  className={bank.status === 'Healthy' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}
                  style={{ marginRight: '4px' }}
                />
                {bank.status}
              </span>
            </div>

            <div className="bank-metrics-row">
              <div className="metric-box">
                <span className="metric-lbl">Success Rate</span>
                <span className={`metric-num ${bank.successRate < 85 ? 'text-warn' : 'text-success'}`}>
                  {bank.successRate}%
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-lbl">Avg Latency</span>
                <span className="metric-num">{bank.avgLatencyMs}ms</span>
              </div>
              <div className="metric-box">
                <span className="metric-lbl">Trend</span>
                <span className="metric-num">
                  {bank.trend === 'improving' ? (
                    <span><i className="fa-solid fa-arrow-trend-up text-success" /> Optimal</span>
                  ) : bank.trend === 'degrading' ? (
                    <span><i className="fa-solid fa-arrow-trend-down text-danger" /> Degraded</span>
                  ) : (
                    <span><i className="fa-solid fa-minus text-muted" /> Stable</span>
                  )}
                </span>
              </div>
            </div>

            <p className="bank-advice">{bank.recommendation}</p>

            <button
              className="btn-toggle-outage"
              onClick={() => toggleDegrade(bank.code)}
              title="Click to simulate gateway failure or recovery"
            >
              <i className="fa-solid fa-sliders" style={{ marginRight: '6px' }} />
              {bank.status === 'Healthy' ? 'Simulate Bank Latency Spike' : 'Restore Bank Normalcy'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
