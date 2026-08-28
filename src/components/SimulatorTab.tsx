import type { Transaction } from '../types';

interface ExceptionItem {
  id: string;
  customerName: string;
  amount: number;
  reason: string;
  errorCode: string;
}

interface SimulatorTabProps {
  simState: 'idle' | 'running' | 'paused' | 'done';
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  simDelay: number;
  setSimDelay: (delay: number) => void;
  batchData: Transaction[];
  processedCount: number;
  recoveredCount: number;
  escalatedCount: number;
  exceptions: ExceptionItem[];
  visaOutage: boolean;
  setVisaOutage: (val: boolean) => void;
  mastercardOutage: boolean;
  setMastercardOutage: (val: boolean) => void;
  upiOutage: boolean;
  setUpiOutage: (val: boolean) => void;
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({
  simState,
  startSimulation,
  pauseSimulation,
  resetSimulation,
  simDelay,
  setSimDelay,
  batchData,
  processedCount,
  recoveredCount,
  escalatedCount,
  exceptions,
  visaOutage,
  setVisaOutage,
  mastercardOutage,
  setMastercardOutage,
  upiOutage,
  setUpiOutage,
}) => {
  const progressPct = batchData.length > 0 
    ? Math.round((processedCount / batchData.length) * 100) 
    : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSimDelay(Number(e.target.value));
  };

  const formatCurrency = (num: number) => {
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <section className="tab-content active" id="tab-simulator" style={{ paddingBottom: '24px' }}>
      <div className="simulator-layout">
        <div className="card sim-controls-card swiss-grid-pattern">
          <div className="card-header">
            <div>
              <span className="section-index">01. SIMULATION CONTROLS</span>
              <h2>Batch Simulation Console</h2>
              <p>Simulate a series of 55 transaction failure webhooks, triggering the autonomous recovery agent to execute interventions on each record.</p>
            </div>
          </div>
          
          <div className="sim-dashboard">
            <div className="sim-meters">
              <div className="sim-meter">
                <div className="sim-meter-label">Simulation Progress</div>
                <div className="sim-meter-val">
                  <span>{progressPct}</span>%
                </div>
                <div className="sim-progress-bar">
                  <div 
                    className="sim-progress-fill" 
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="sim-meter-sub" id="sim-progress-sub">
                  {processedCount} of {batchData.length} records completed
                </div>
              </div>

              <div className="sim-speed-box">
                <label htmlFor="sim-speed-slider">Simulation Step Delay</label>
                <div className="slider-container">
                  <input
                    type="range"
                    id="sim-speed-slider"
                    min="500"
                    max="3000"
                    step="500"
                    value={simDelay}
                    onChange={handleSliderChange}
                  />
                  <span id="sim-speed-value">{(simDelay / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>

            <div className="sim-actions-grid">
              <button
                className="btn btn-success btn-lg"
                onClick={startSimulation}
                disabled={simState === 'running'}
                id="btn-start-sim"
              >
                <i className="fa-solid fa-play" /> Start Batch Simulation
              </button>
              <button
                className="btn btn-warning btn-lg"
                onClick={pauseSimulation}
                disabled={simState !== 'running'}
                id="btn-pause-sim"
              >
                <i className="fa-solid fa-pause" /> Pause
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={resetSimulation}
                id="btn-reset-sim"
              >
                <i className="fa-solid fa-rotate-left" /> Reset Batch
              </button>
            </div>
          </div>

          {/* Gateway Downtime Outage Simulator Section */}
          <div className="outage-simulator-section">
            <span className="section-index">01b. NETWORK DOWNTIME EMULATOR</span>
            <h3>Simulate Bank & Gateway Server Outages</h3>
            <p className="outage-desc">Activate server drops to test the agent's resilience, downtime delay actions, and alternative channel routing (e.g. switching cards to UPI Autopay).</p>
            
            <div className="outage-controls-grid">
              <label className="outage-toggle-card">
                <input 
                  type="checkbox" 
                  checked={visaOutage} 
                  onChange={(e) => setVisaOutage(e.target.checked)} 
                />
                <div className="toggle-label-box">
                  <strong>Visa Issuer Network Down</strong>
                  <span>Simulates downtime on HDFC/ICICI Visa card gateways.</span>
                </div>
              </label>

              <label className="outage-toggle-card">
                <input 
                  type="checkbox" 
                  checked={mastercardOutage} 
                  onChange={(e) => setMastercardOutage(e.target.checked)} 
                />
                <div className="toggle-label-box">
                  <strong>Mastercard Auth Outage</strong>
                  <span>Simulates transaction drops on card 3D Secure verification.</span>
                </div>
              </label>

              <label className="outage-toggle-card">
                <input 
                  type="checkbox" 
                  checked={upiOutage} 
                  onChange={(e) => setUpiOutage(e.target.checked)} 
                />
                <div className="toggle-label-box">
                  <strong>UPI Network Slowdown</strong>
                  <span>Simulates slow response rates on UPI PSP apps.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="sim-rules-box">
            <h3><i className="fa-solid fa-circle-info" /> Simulation Mechanics & Bounded Rules</h3>
            <ul>
              <li><strong>Trigger:</strong> The simulation fires simulated webhook events (`payment.failed` or `checkout.abandoned`) to the recovery agent pipeline.</li>
              <li><strong>Diagnosis (Feature D):</strong> The AI Agent checks the card brand status (Visa, Mastercard, RuPay) and delays retry if the gateway is experiencing bank server downtime.</li>
              <li><strong>Dynamic Escalation (Feature A):</strong> The agent automatically increases discounts on sequential reminders (0% nudge #1 $\rightarrow$ 5% discount nudge #2 $\rightarrow$ 8% discount + split pay nudge #3).</li>
              <li><strong>State Machine:</strong> Each transaction advances through states: <em>Failed $\rightarrow$ Recovering $\rightarrow$ Success (Recovered)</em> or escalates to <em>Escalated (Failed Permanent)</em>.</li>
              <li><strong>Compliance Rules:</strong> If a customer replies with opt-out keywords (e.g., "STOP"), the agent immediately halts all notifications to maintain merchant compliance.</li>
            </ul>
          </div>
        </div>

        <div className="card sim-results-card swiss-dots">
          <div className="card-header">
            <div>
              <span className="section-index">02. BATCH REAL-TIME METRICS</span>
              <h2>Real-time Simulation Metrics</h2>
            </div>
          </div>
          <div className="sim-results-grid">
            <div className="result-tile">
              <span className="tile-title">Total Batch Size</span>
              <span className="tile-value" id="sim-batch-size">{batchData.length}</span>
            </div>
            <div className="result-tile">
              <span className="tile-title">Processed</span>
              <span className="tile-value text-primary" id="sim-processed-count">{processedCount}</span>
            </div>
            <div className="result-tile">
              <span className="tile-title">Recovered</span>
              <span className="tile-value text-recovered" id="sim-recovered-count">{recoveredCount}</span>
            </div>
            <div className="result-tile">
              <span className="tile-title">Escalated (Permanent Fail)</span>
              <span className="tile-value text-risk" id="sim-escalated-count">{escalatedCount}</span>
            </div>
          </div>
          
          <div className="exception-summary">
            <span className="section-index">02.1 SYSTEM EXCEPTIONS</span>
            <h3>Exceptions & Unresolved Failures</h3>
            <p className="summary-desc">These are failures that the AI Agent could not recover automatically (e.g., hard bank declines, Daily card limit exceeded, opt-out triggers, or no customer response after maximum retries).</p>
            <div className="exception-list-container">
              <ul className="exception-list" id="sim-exception-list">
                {exceptions.length === 0 ? (
                  <li className="empty-exception-msg">No exceptions logged yet. Run simulation to gather data.</li>
                ) : (
                  exceptions.map((ex, index) => (
                    <li key={`${ex.id}-${index}`} className="exception-item">
                      <div className="exception-meta">
                        <span>{ex.id} - {ex.customerName}</span>
                        <strong>₹{formatCurrency(ex.amount)}</strong>
                      </div>
                      <span className="exception-reason">[EXCEPTION] {ex.reason} (Gateway: {ex.errorCode})</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
