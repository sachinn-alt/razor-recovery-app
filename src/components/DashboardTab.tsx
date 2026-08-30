import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Transaction } from '../types';
import { HostedCheckout } from './HostedCheckout';
import { CadenceTimeline } from './CadenceTimeline';
import { BankHealthRadar } from './BankHealthRadar';
import { ReconciliationModal } from './ReconciliationModal';

interface DashboardTabProps {
  batchData: Transaction[];
  chartHistory: { recovered: number; lost: number; count: number }[];
  selectedTxId: string | null;
  setSelectedTxId: (id: string | null) => void;
  onNudge: (id: string) => void;
  onEscalate: (id: string) => void;
  onSwitchToPlayground: (tx: Transaction) => void;
  onAddTransaction?: (tx: Transaction) => void;
  waTemplate: string;
  emailTemplate: string;
  smsTemplate: string;
}

interface RecoveryChartProps {
  history: { recovered: number; lost: number; count: number }[];
}

export const RecoveryChart: React.FC<RecoveryChartProps> = ({ history }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const svgWidth = 800;
  const svgHeight = 240;
  const margin = { top: 20, right: 30, bottom: 35, left: 70 };

  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  const maxVal = Math.max(
    ...history.map(d => Math.max(d.recovered, d.lost)),
    50000
  );

  const getX = (index: number) => {
    if (history.length <= 1) return margin.left;
    return margin.left + (index / (history.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return margin.top + chartHeight - (val / maxVal) * chartHeight;
  };

  let recoveredPath = '';
  let lostPath = '';

  if (history.length > 0) {
    recoveredPath = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.recovered)}`).join(' ');
    lostPath = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.lost)}`).join(' ');
  }

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  const formatYLabel = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height="240" viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: 'visible' }}>
        {gridLevels.map((lvl, idx) => {
          const val = lvl * maxVal;
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={margin.left}
                y1={y}
                x2={svgWidth - margin.right}
                y2={y}
                className={val === 0 ? 'chart-grid-line bold' : 'chart-grid-line'}
              />
              <text
                x={margin.left - 10}
                y={y + 4}
                textAnchor="end"
                className="chart-axis-text"
              >
                {formatYLabel(val)}
              </text>
            </g>
          );
        })}

        <text x={margin.left} y={svgHeight - 8} textAnchor="start" className="chart-axis-text">
          Start
        </text>
        <text x={margin.left + chartWidth / 2} y={svgHeight - 8} textAnchor="middle" className="chart-axis-text">
          Simulation Progress (Ticks)
        </text>
        <text x={svgWidth - margin.right} y={svgHeight - 8} textAnchor="end" className="chart-axis-text">
          Count: {history.length - 1}
        </text>

        {recoveredPath && (
          <path d={recoveredPath} fill="none" className="chart-line recovered" strokeWidth="2.5" />
        )}
        {lostPath && (
          <path d={lostPath} fill="none" className="chart-line lost" strokeWidth="2.5" />
        )}

        {history.map((d, i) => (
          <g key={i} className="chart-point-group">
            <circle
              cx={getX(i)}
              cy={getY(d.recovered)}
              r={hoveredIdx === i ? 6 : 3.5}
              className="chart-point recovered"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            <circle
              cx={getX(i)}
              cy={getY(d.lost)}
              r={hoveredIdx === i ? 6 : 3.5}
              className="chart-point lost"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          </g>
        ))}

        {hoveredIdx !== null && history[hoveredIdx] && (
          <g className="chart-tooltip-group" transform={`translate(${getX(hoveredIdx)}, 10)`}>
            <line
              x1="0"
              y1={margin.top}
              x2="0"
              y2={margin.top + chartHeight}
              className="chart-hover-line"
            />
            {(() => {
              const tooltipX = hoveredIdx > history.length / 2 ? -140 : 10;
              return (
                <g transform={`translate(${tooltipX}, 0)`} className="chart-tooltip-bubble">
                  <rect width="130" height="64" rx="2" className="chart-tooltip-bg" />
                  <text x="12" y="18" className="chart-tooltip-title">
                    Tick #{hoveredIdx}
                  </text>
                  <text x="12" y="38" className="chart-tooltip-value recovered">
                    Rec: ₹{history[hoveredIdx].recovered.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </text>
                  <text x="12" y="58" className="chart-tooltip-value lost">
                    Loss/Esc: ₹{history[hoveredIdx].lost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
};

export const DashboardTab: React.FC<DashboardTabProps> = ({
  batchData,
  chartHistory,
  selectedTxId,
  setSelectedTxId,
  onNudge,
  onEscalate,
  onSwitchToPlayground,
  onAddTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'failed' | 'recovering' | 'recovered' | 'escalated'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showBankHealth, setShowBankHealth] = useState(false);
  const [checkoutModalTx, setCheckoutModalTx] = useState<Transaction | null>(null);
  const [reconModalTx, setReconModalTx] = useState<Transaction | null>(null);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  let failedTotal = 0;
  let recoveredTotal = 0;
  let failedCount = 0;
  let recoveredCount = 0;
  let activeRetries = 0;

  batchData.forEach(tx => {
    if (tx.status === 'Failed') {
      failedTotal += tx.amount;
      failedCount++;
    } else if (tx.status === 'Recovered') {
      recoveredTotal += tx.amount;
      recoveredCount++;
    } else if (tx.status === 'Recovering') {
      failedTotal += tx.amount;
      failedCount++;
      activeRetries++;
    } else if (tx.status === 'Escalated') {
      failedTotal += tx.amount;
      failedCount++;
    }
  });

  const recoveryRate = (failedCount + recoveredCount) > 0 ? (recoveredCount / (failedCount + recoveredCount)) * 100 : 0;
  const netMarginSaved = Math.max(0, recoveredTotal * 0.94);

  const formatCurrency = (num: number) => {
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const filteredData = batchData.filter(tx => {
    const matchesSearch =
      tx.customerName.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && tx.status.toLowerCase() === statusFilter;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('Aarav Mehta');
  const [newAmount, setNewAmount] = useState('4499.00');
  const [newFailureType, setNewFailureType] = useState<Transaction['failureType']>('authentication_failed');

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const txId = `pay_fail_${Date.now().toString(36).toUpperCase()}`;
    const amountNum = parseFloat(newAmount) || 4499.00;

    let errorCode = 'BAD_REQUEST_AUTHENTICATION_FAILED';
    let notes = '3D Secure OTP verification timed out on customer device';
    if (newFailureType === 'card_declined_insufficient_funds') {
      errorCode = 'INSUFFICIENT_FUNDS';
      notes = 'Card declined due to insufficient balance';
    } else if (newFailureType === 'network_timeout') {
      errorCode = 'GATEWAY_ERROR';
      notes = 'Bank gateway network timeout (503)';
    } else if (newFailureType === 'mandate_registration_failed') {
      errorCode = 'UPI_LIMIT_EXCEEDED';
      notes = 'Daily transaction limit exceeded on customer VPA';
    }

    const createdTx: Transaction = {
      id: txId,
      customerName: newCustName.trim() || 'Aarav Mehta',
      email: `${newCustName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: '+91 98765 12345',
      amount: amountNum,
      productName: 'E-commerce Checkout Cart',
      timestamp: new Date().toISOString(),
      failureType: newFailureType,
      initialErrorCode: errorCode,
      status: 'Failed',
      attempts: 0,
      maxAttempts: 3,
      recoveryChannel: 'WhatsApp',
      notes,
      cartExpiresAt: new Date(Date.now() + 15 * 60000).toISOString()
    };

    if (onAddTransaction) {
      onAddTransaction(createdTx);
    }
    setIsAddModalOpen(false);
  };

  const selectedTx = batchData.find(tx => tx.id === selectedTxId);

  const getTimelineEvents = (tx: Transaction) => {
    const events = [];
    const date = new Date(tx.timestamp);

    events.push({
      time: new Date(date.getTime() + 2000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      act: 'Webhook Captured',
      desc: `Event [payment.failed] captured. Root error code: ${tx.initialErrorCode}`,
      type: 'info'
    });

    events.push({
      time: new Date(date.getTime() + 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      act: 'Optimizer Routing',
      desc: `Optimizer determined ${tx.failureType === 'card_declined_insufficient_funds' ? 'Cardless EMI / PayLater fallback' : '1-Click UPI Intent'}`,
      type: 'info'
    });

    if (tx.status === 'Recovering' || tx.status === 'Recovered') {
      events.push({
        time: new Date(date.getTime() + 8000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        act: 'Cadence Nudge Dispatched',
        desc: `Dispatched 1-Click Hosted Checkout link with 15m Cart Lock.`,
        type: 'info'
      });
    }

    if (tx.status === 'Recovered') {
      events.push({
        time: new Date(date.getTime() + 15000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        act: 'Settlement Confirmed',
        desc: `1-Tap settlement confirmed via ${tx.resolvedMethod || 'Turbo UPI'}. Downstream drip cancelled.`,
        type: 'success'
      });
    }

    return events;
  };

  const handleCheckoutSuccess = (txId: string, method: string) => {
    const target = batchData.find(t => t.id === txId);
    if (target) {
      target.status = 'Recovered';
      target.resolvedMethod = method;
    }
    setCheckoutModalTx(null);
  };

  const handleReconcileSuccess = (txId: string, utr: string) => {
    const target = batchData.find(t => t.id === txId);
    if (target) {
      target.status = 'Recovered';
      target.reconciledUtr = utr;
      target.resolvedMethod = 'Auto-Reconciled';
    }
    setReconModalTx(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="tab-content active" id="tab-dashboard">
      {/* Executive ROI & Financial Impact Summary Banner - Compact 1-Row Ribbon */}
      <motion.div
        className="executive-roi-banner"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="roi-items-container">
          <div className="roi-stat-box">
            <span className="roi-lbl">
              <i className="fa-solid fa-vault text-primary" />
              Gross GMV Rescued:
            </span>
            <span className="roi-val highlight">₹{formatCurrency(recoveredTotal)}</span>
          </div>

          <div className="roi-divider" />

          <div className="roi-stat-box">
            <span className="roi-lbl">
              <i className="fa-solid fa-bullseye text-primary" />
              Recovery Rate:
            </span>
            <span className="roi-val text-success">{recoveryRate.toFixed(1)}%</span>
          </div>

          <div className="roi-divider" />

          <div className="roi-stat-box">
            <span className="roi-lbl">
              <i className="fa-solid fa-chart-line text-primary" />
              Margin Saved:
            </span>
            <span className="roi-val">₹{formatCurrency(netMarginSaved)}</span>
          </div>

          <div className="roi-divider" />

          <div className="roi-stat-box">
            <span className="roi-lbl">
              <i className="fa-solid fa-bolt text-primary" />
              Top Rail:
            </span>
            <span className="roi-val" style={{ fontSize: '12px' }}>Turbo UPI (44.2%)</span>
          </div>
        </div>

        <div className="roi-action-box">
          <button
            className={`btn-bank-radar-toggle ${showBankHealth ? 'active' : ''}`}
            onClick={() => setShowBankHealth(!showBankHealth)}
            title="Toggle Live Banking Gateway Telemetry"
          >
            <i className="fa-solid fa-satellite-dish" />
            <span>{showBankHealth ? 'Hide Radar' : 'Bank Health Radar'}</span>
          </button>
        </div>
      </motion.div>

      {/* Real-Time Bank Outage & Downstream Health Radar */}
      <AnimatePresence>
        {showBankHealth && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: '20px', overflow: 'hidden' }}
          >
            <BankHealthRadar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards Grid */}
      <motion.div
        className="metrics-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants} className="metric-card" id="metric-failed-amount">
          <div className="metric-header">
            <span className="metric-title">Failed Revenue</span>
            <div className="metric-icon-box failed">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
          </div>
          <div className="metric-value">₹{formatCurrency(failedTotal)}</div>
          <div className="metric-footer">
            <span className="metric-desc">{failedCount} Failed Checkouts</span>
            <span className="metric-trend text-danger"><i className="fa-solid fa-arrow-up" /> Gateway Friction</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="metric-card" id="metric-recovered-amount">
          <div className="metric-header">
            <span className="metric-title">Recovered Revenue</span>
            <div className="metric-icon-box recovered">
              <i className="fa-solid fa-shield-halved" />
            </div>
          </div>
          <div className="metric-value text-success">₹{formatCurrency(recoveredTotal)}</div>
          <div className="metric-footer">
            <span className="metric-desc">{recoveredCount} Orders Rescued</span>
            <span className="metric-trend text-success"><i className="fa-solid fa-arrow-trend-up" /> +35.4% Lift</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="metric-card" id="metric-recovery-rate">
          <div className="metric-header">
            <span className="metric-title">Recovery Rate</span>
            <div className="metric-icon-box rate">
              <i className="fa-solid fa-chart-line" />
            </div>
          </div>
          <div className="metric-value">{recoveryRate.toFixed(1)}%</div>
          <div className="metric-footer">
            <span className="metric-desc">Target: 30.0%</span>
            <span className="metric-trend text-success"><i className="fa-solid fa-bullseye" /> Top Tier</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="metric-card" id="metric-active-interventions">
          <div className="metric-header">
            <span className="metric-title">Active Drip Retries</span>
            <div className="metric-icon-box active-retries">
              <i className="fa-solid fa-arrows-spin fa-spin" />
            </div>
          </div>
          <div className="metric-value">{activeRetries}</div>
          <div className="metric-footer">
            <span className="metric-desc">In Multi-Touch Pipeline</span>
            <span className="metric-trend text-warning"><i className="fa-solid fa-clock" /> Scheduled Nudges</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Recovery Performance Chart */}
      <motion.div
        className="card recovery-chart-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="card-header">
          <div>
            <span className="section-index">01b. RECOVERY TIMELINE CURVE</span>
            <h2>Cumulative Revenue Recovery Trend</h2>
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot recovered" /> Recovered Revenue</span>
            <span className="legend-item"><span className="legend-dot lost" /> Permanent Loss / Escalated</span>
          </div>
        </div>
        <div className="card-body">
          <RecoveryChart history={chartHistory} />
        </div>
      </motion.div>

      {/* Main Split: Table + Inspector Drawer */}
      <div className="dashboard-split">
        {/* Left Side Table */}
        <div className="card transaction-monitor">
          <div className="card-header">
            <div className="card-header-left">
              <span className="section-index">02. SYSTEM RECORD LOGS</span>
              <h2>Failure & Recovery Log</h2>
              <span className="tag tag-count" id="txt-total-batch-count">{batchData.length} Records</span>
            </div>
            <div className="table-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setIsAddModalOpen(true)}
                id="btn-open-inject-modal"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                <i className="fa-solid fa-plus-circle" /> Add Failed Payment
              </button>

              <div className="search-box">
                <i className="fa-solid fa-magnifying-glass" />
                <input
                  type="text"
                  className="search-input"
                  id="tx-search-input"
                  placeholder="Search by name, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="filter-tabs">
                {(['all', 'failed', 'recovering', 'recovered', 'escalated'] as const).map((f) => (
                  <button
                    key={f}
                    className={`filter-tab ${statusFilter === f ? 'active' : ''}`}
                    onClick={() => setStatusFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="tx-table" id="transaction-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Failure Reason</th>
                  <th>Status</th>
                  <th>Quick Action</th>
                </tr>
              </thead>
              <tbody id="transaction-table-body">
                <AnimatePresence initial={false}>
                  {paginatedData.map(tx => {
                    let friendlyReason = tx.failureType.split('_').join(' ');
                    friendlyReason = friendlyReason.charAt(0).toUpperCase() + friendlyReason.slice(1);
                    const isSelected = selectedTxId === tx.id;

                    return (
                      <motion.tr
                        key={tx.id}
                        layoutId={`row_${tx.id}`}
                        onClick={() => setSelectedTxId(tx.id)}
                        className={`tx-row ${isSelected ? 'selected' : ''}`}
                        style={{ contentVisibility: 'auto' }}
                      >
                        <td className="tx-id">{tx.id}</td>
                        <td className="tx-customer-cell">
                          <span className="tx-customer-name">{tx.customerName}</span>
                          <span className="tx-customer-phone">{tx.phone}</span>
                        </td>
                        <td>{tx.productName}</td>
                        <td className="tx-amount">₹{formatCurrency(tx.amount)}</td>
                        <td className="tx-failure-type">{friendlyReason}</td>
                        <td>
                          <span className={`status-badge ${tx.status.toLowerCase()}`}>{tx.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn-action-pill pay"
                              title="Test 1-Click Customer Checkout"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCheckoutModalTx(tx);
                              }}
                            >
                              <i className="fa-solid fa-bolt" style={{ marginRight: '4px' }} />
                              1-Tap Pay
                            </button>
                            <button
                              className="btn-action-pill recon"
                              title="Resolve Double Debit / UTR Dispute"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReconModalTx(tx);
                              }}
                            >
                              <i className="fa-solid fa-shield-halved" style={{ marginRight: '4px' }} />
                              Reconcile
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="empty-state" id="table-empty-state">
                <i className="fa-solid fa-folder-open" />
                <p>No transactions found matching the filter.</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="table-pagination">
                <button
                  className="btn btn-outline btn-xs"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-outline btn-xs"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Drawer / Details Panel with Cadence Visualizer */}
        <div className="detail-sidebar" id="detail-inspector-panel">
          <AnimatePresence mode="wait">
            {!selectedTx ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inspector-empty-state swiss-dots"
                id="inspector-empty-state"
                style={{ padding: '48px 24px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
              >
                <div className="empty-gfx" style={{ fontSize: '32px', marginBottom: '16px' }}>
                  <i className="fa-solid fa-microchip" />
                </div>
                <h3>AI Agent Auditor</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Select any transaction to inspect the live 4-stage Drip Cadence sequence, launch 1-Click Checkout, or audit AI diagnostics.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedTx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="detail-scrollable"
                id="inspector-content"
              >
                {/* Header */}
                <div className="detail-header">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="section-index">03. RECOVERY INSPECTOR</span>
                    <h3 className="detail-title" id="ins-customer-name">{selectedTx.customerName}</h3>
                    <span className="inspector-id" id="ins-tx-id" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{selectedTx.id}</span>
                  </div>
                  <span className={`status-badge ${selectedTx.status.toLowerCase()}`} id="ins-status-badge">
                    {selectedTx.status}
                  </span>
                </div>

                <div style={{ padding: '16px 0' }}>
                  <div className="info-grid" style={{ marginBottom: '16px' }}>
                    <div className="info-item">
                      <strong>Product / Order</strong>
                      <span id="ins-product-name">{selectedTx.productName}</span>
                    </div>
                    <div className="info-item">
                      <strong>Payment Amount</strong>
                      <span id="ins-amount" style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                        ₹{formatCurrency(selectedTx.amount)}
                      </span>
                    </div>
                    <div className="info-item">
                      <strong>Contact</strong>
                      <span>{selectedTx.phone}</span>
                    </div>
                  </div>

                  {/* 1-Click Checkout Launch Trigger */}
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      className="btn-launch-checkout-cta"
                      onClick={() => setCheckoutModalTx(selectedTx)}
                    >
                      <span>
                        <i className="fa-solid fa-bolt" style={{ marginRight: '8px' }} />
                        Open 1-Click Hosted Checkout Preview
                      </span>
                      <span className="btn-badge">15m Cart Lock</span>
                    </button>
                  </div>

                  {/* Embedded Multi-Touch Drip Cadence Engine */}
                  <div className="timeline-section" style={{ marginBottom: '20px' }}>
                    <CadenceTimeline
                      transaction={selectedTx}
                      onSimulateRecovery={(txId) => handleCheckoutSuccess(txId, 'UPI_INTENT')}
                    />
                  </div>

                  {/* AI Diagnosis & RCA */}
                  <div className="timeline-section">
                    <h4 className="section-title" style={{ fontSize: '12px', marginBottom: '12px' }}>
                      <i className="fa-solid fa-magnifying-glass-chart" /> 03.2 AI DIAGNOSIS & SMART ROUTING
                    </h4>
                    <div className="preview-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '10px' }}>ERROR CODE:</span>
                        <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{selectedTx.initialErrorCode}</code>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{selectedTx.notes}</p>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Strategy: <span style={{ color: 'var(--color-primary)' }}>
                          {selectedTx.failureType === 'card_declined_insufficient_funds' ? 'Cardless EMI / PayLater fallback' :
                           selectedTx.failureType === 'mandate_registration_failed' ? 'UPI Autopay Migration Campaign' :
                           '1-Click WhatsApp Express Recovery'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Workflow Audit Trail */}
                  <div className="timeline-section" style={{ marginTop: '16px' }}>
                    <h4 className="section-title" style={{ fontSize: '12px', marginBottom: '12px' }}>
                      <i className="fa-solid fa-clock-rotate-left" /> 03.3 WORKFLOW AUDIT TRAIL
                    </h4>
                    <ul className="timeline" id="ins-timeline">
                      {getTimelineEvents(selectedTx).map((ev, index) => (
                        <li key={index} className={`timeline-item ${ev.type === 'success' ? 'success' : ''}`}>
                          <div className="timeline-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="timeline-act" style={{ fontSize: '11px', fontWeight: 'bold' }}>{ev.act}</span>
                            <span className="timeline-time" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ev.time}</span>
                          </div>
                          <span className="timeline-desc" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="action-buttons" style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onSwitchToPlayground(selectedTx)}
                    >
                      <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px' }} />
                      Test AI Chat
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onNudge(selectedTx.id)}
                    >
                      <i className="fa-solid fa-paper-plane" style={{ marginRight: '6px' }} />
                      Nudge
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onEscalate(selectedTx.id)}
                    >
                      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }} />
                      Escalate
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 1-Click Hosted Checkout Preview Modal */}
      {checkoutModalTx && (
        <HostedCheckout
          isModal={true}
          checkoutData={{
            transactionId: checkoutModalTx.id,
            customerName: checkoutModalTx.customerName,
            customerEmail: checkoutModalTx.email,
            customerPhone: checkoutModalTx.phone,
            productName: checkoutModalTx.productName,
            originalAmount: checkoutModalTx.amount,
            discountPercentage: 5,
            discountAmount: (checkoutModalTx.amount * 5) / 100,
            finalAmount: Math.round(checkoutModalTx.amount * 0.95),
            currency: 'INR',
            cartExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
            recommendedMethod: 'UPI Intent (Google Pay / PhonePe)',
            status: checkoutModalTx.status === 'Recovered' ? 'completed' : 'active',
            merchantName: 'Acme India Corp'
          }}
          onPaySuccess={handleCheckoutSuccess}
          onClose={() => setCheckoutModalTx(null)}
        />
      )}

      {/* Auto-Reconciliation Modal */}
      {reconModalTx && (
        <ReconciliationModal
          transaction={reconModalTx}
          onClose={() => setReconModalTx(null)}
          onReconciled={handleReconcileSuccess}
        />
      )}

      {/* Inject Failed Payment Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card glass-panel" style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Simulate Failed Payment Ingestion</h3>
              <button className="close-checkout-btn" onClick={() => setIsAddModalOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-lbl">Customer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-lbl">Amount (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-lbl">Failure Reason</label>
                <select
                  className="form-select"
                  value={newFailureType}
                  onChange={e => setNewFailureType(e.target.value as any)}
                >
                  <option value="authentication_failed">3D Secure OTP verification timed out</option>
                  <option value="card_declined_insufficient_funds">Card declined: Insufficient funds</option>
                  <option value="network_timeout">Bank gateway network timeout (503)</option>
                  <option value="mandate_registration_failed">UPI daily transaction limit reached</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary full-width" style={{ padding: '10px' }}>
                <i className="fa-solid fa-bolt" style={{ marginRight: '6px' }} />
                Ingest Failed Payment & Trigger Drip Cadence
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
