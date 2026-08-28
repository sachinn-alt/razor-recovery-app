import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Transaction } from '../types';

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

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 240;
  const margin = { top: 20, right: 30, bottom: 35, left: 70 };

  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  // Determine scales
  const maxVal = Math.max(
    ...history.map(d => Math.max(d.recovered, d.lost)),
    50000 // default minimum upper bound
  );

  const getX = (index: number) => {
    if (history.length <= 1) return margin.left;
    return margin.left + (index / (history.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return margin.top + chartHeight - (val / maxVal) * chartHeight;
  };

  // Generate paths
  let recoveredPath = '';
  let lostPath = '';

  if (history.length > 0) {
    recoveredPath = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.recovered)}`).join(' ');
    lostPath = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.lost)}`).join(' ');
  }

  // Grid levels (5 horizontal lines)
  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  const formatYLabel = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height="240" viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: 'visible' }}>
        {/* Horizontal Gridlines */}
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

        {/* X Axis Labels */}
        <text
          x={margin.left}
          y={svgHeight - 8}
          textAnchor="start"
          className="chart-axis-text"
        >
          Start
        </text>
        <text
          x={margin.left + chartWidth / 2}
          y={svgHeight - 8}
          textAnchor="middle"
          className="chart-axis-text"
        >
          Simulation Progress (Ticks)
        </text>
        <text
          x={svgWidth - margin.right}
          y={svgHeight - 8}
          textAnchor="end"
          className="chart-axis-text"
        >
          Count: {history.length - 1}
        </text>

        {/* Lines */}
        {history.length > 1 && (
          <>
            <path d={recoveredPath} className="chart-line-recovered" />
            <path d={lostPath} className="chart-line-lost" />

            {/* Points (Only show if history length is reasonable, e.g. < 60) */}
            {history.length < 60 && history.map((d, i) => (
              <g key={i}>
                <circle
                  cx={getX(i)}
                  cy={getY(d.recovered)}
                  r="3.5"
                  className="chart-point recovered"
                />
                <circle
                  cx={getX(i)}
                  cy={getY(d.lost)}
                  r="3.5"
                  className="chart-point lost"
                />
              </g>
            ))}
          </>
        )}

        {/* Interactive Hover Areas */}
        {history.length > 1 && history.map((_, i) => {
          const x = getX(i);
          const colWidth = chartWidth / (history.length - 1);
          return (
            <rect
              key={i}
              x={x - colWidth / 2}
              y={margin.top}
              width={colWidth}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            />
          );
        })}

        {/* Hover Line & Tooltip rendering */}
        {hoveredIdx !== null && hoveredIdx < history.length && (
          <g>
            {/* Vertical Guide Line */}
            <line
              x1={getX(hoveredIdx)}
              y1={margin.top}
              x2={getX(hoveredIdx)}
              y2={margin.top + chartHeight}
              className="chart-interactive-bar"
            />

            {/* Tooltip Box */}
            {(() => {
              const xPos = getX(hoveredIdx);
              // Shift tooltip left if it's near the right edge
              const tooltipWidth = 160;
              const tooltipHeight = 75;
              const isRightSide = xPos > svgWidth - margin.right - 100;
              const tx = isRightSide ? xPos - tooltipWidth - 15 : xPos + 15;
              const ty = margin.top + 10;

              return (
                <g transform={`translate(${tx}, ${ty})`}>
                  <rect
                    width={tooltipWidth}
                    height={tooltipHeight}
                    className="chart-tooltip-box"
                  />
                  <text x="12" y="20" className="chart-tooltip-title">
                    Tick #{hoveredIdx}
                  </text>
                  <text x="12" y="40" className="chart-tooltip-value recovered">
                    Recovered: ₹{history[hoveredIdx].recovered.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
  waTemplate,
  emailTemplate,
  smsTemplate,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'failed' | 'recovering' | 'recovered' | 'escalated'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Metrics calculation
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

  const recoveryRate = failedCount > 0 ? (recoveredCount / failedCount) * 100 : 0;

  const formatCurrency = (num: number) => {
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Filter list
  const filteredData = batchData.filter(tx => {
    const matchesSearch = tx.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          tx.id.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && tx.status.toLowerCase() === statusFilter;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('Aarav Mehta');
  const [newCustEmail, setNewCustEmail] = useState('aarav.mehta@example.com');
  const [newCustPhone, setNewCustPhone] = useState('+91 98765 12345');
  const [newProduct, setNewProduct] = useState('E-commerce Checkout Cart');
  const [newAmount, setNewAmount] = useState('4499.00');
  const [newFailureType, setNewFailureType] = useState<Transaction['failureType']>('authentication_failed');
  const [newNotes, setNewNotes] = useState('3D Secure OTP verification timed out on customer device');

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const txId = `pay_fail_${Date.now().toString(36).toUpperCase()}`;
    const amountNum = parseFloat(newAmount) || 4499.00;
    
    let errorCode = 'BAD_REQUEST_AUTHENTICATION_FAILED';
    if (newFailureType === 'card_declined_insufficient_funds') errorCode = 'INSUFFICIENT_FUNDS';
    else if (newFailureType === 'network_timeout') errorCode = 'GATEWAY_ERROR';
    else if (newFailureType === 'mandate_registration_failed') errorCode = 'UPI_LIMIT_EXCEEDED';

    const createdTx: Transaction = {
      id: txId,
      customerName: newCustName.trim() || 'Aarav Mehta',
      email: newCustEmail.trim() || 'aarav.mehta@example.com',
      phone: newCustPhone.trim() || '+91 98765 12345',
      amount: amountNum,
      productName: newProduct.trim() || 'E-commerce Checkout Cart',
      timestamp: new Date().toISOString(),
      failureType: newFailureType,
      initialErrorCode: errorCode,
      status: 'Failed',
      attempts: 0,
      maxAttempts: 3,
      recoveryChannel: 'WhatsApp',
      notes: newNotes.trim() || 'Payment declined by issuing bank during checkout'
    };

    if (onAddTransaction) {
      onAddTransaction(createdTx);
    }

    setIsAddModalOpen(false);
  };

  const handleApplyPreset = (preset: 'otp' | 'balance' | 'upi_limit' | 'gateway_503') => {
    if (preset === 'otp') {
      setNewFailureType('authentication_failed');
      setNewNotes('3D Secure OTP verification timed out on customer device');
    } else if (preset === 'balance') {
      setNewFailureType('card_declined_insufficient_funds');
      setNewNotes('Debit card transaction declined due to insufficient balance');
    } else if (preset === 'upi_limit') {
      setNewFailureType('mandate_registration_failed');
      setNewNotes('Daily transaction limit exceeded for customer UPI VPA');
    } else if (preset === 'gateway_503') {
      setNewFailureType('network_timeout');
      setNewNotes('Acquiring bank payment gateway timeout during high peak load');
    }
  };

  const selectedTx = batchData.find(tx => tx.id === selectedTxId);

  // Generate timeline helper
  const getTimelineEvents = (tx: Transaction) => {
    const events = [];
    const date = new Date(tx.timestamp);

    events.push({
      time: new Date(date.getTime() + 2000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      act: 'Webhook Received',
      desc: `Event [payment.failed] captured. Root error code: ${tx.initialErrorCode}`,
      type: 'info'
    });

    events.push({
      time: new Date(date.getTime() + 6000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      act: 'AI Diagnosis Logged',
      desc: `Identified failure class: [${tx.failureType.toUpperCase()}]. Initiated sequence template.`,
      type: 'info'
    });

    if (tx.attempts > 0 || tx.status === 'Recovering' || tx.status === 'Recovered' || tx.status === 'Escalated') {
      events.push({
        time: new Date(date.getTime() + 15000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        act: `Recovery Nudge Sent (#1)`,
        desc: `Dispatched campaign link via ${tx.recoveryChannel}. Delivery confirmed.`,
        type: tx.status === 'Failed' ? 'failed' : 'info'
      });
    }

    if (tx.attempts > 1) {
      events.push({
        time: new Date(date.getTime() + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        act: `Recovery Nudge Sent (#2) - Discount Applied`,
        desc: `No response detected. Sent sequential nudge with 5% discount: rpy.to/rec_${tx.id}`,
        type: 'info'
      });
    }

    if (tx.attempts > 2) {
      events.push({
        time: new Date(date.getTime() + 120000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        act: `Recovery Nudge Sent (#3) - Split Payment Offer`,
        desc: `Third sequence nudge dispatched. Offering split billing checkout terms.`,
        type: 'info'
      });
    }

    if (tx.status === 'Recovered') {
      events.push({
        time: new Date(date.getTime() + (tx.attempts > 0 ? tx.attempts * 60000 : 30000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        act: 'Payment Recovered!',
        desc: `Payment processed successfully via Razorpay test payment window. Status resolved.`,
        type: 'success'
      });
    } else if (tx.status === 'Escalated') {
      events.push({
        time: new Date(date.getTime() + 180000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        act: 'Workflow Gated (Escalated)',
        desc: `Intervention count exceeded max retries or user opted out. Flagged for manual merchant intervention.`,
        type: 'failed'
      });
    }

    return events;
  };

  const interpolateTemplate = (
    template: string,
    data: { customerName: string; amount: number; productName: string; notes: string; checkoutLink: string }
  ) => {
    return template
      .replace(/\{\{customerName\}\}/g, data.customerName)
      .replace(/\{\{amount\}\}/g, data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      .replace(/\{\{productName\}\}/g, data.productName)
      .replace(/\{\{notes\}\}/g, data.notes || 'a billing decline')
      .replace(/\{\{checkoutLink\}\}/g, data.checkoutLink);
  };

  // Nudge text helper
  const getMockMessage = (tx: Transaction) => {
    const mockLink = `rpy.to/rec_${tx.id}`;
    let template = waTemplate;
    if (tx.recoveryChannel === 'Email') template = emailTemplate;
    else if (tx.recoveryChannel === 'SMS') template = smsTemplate;

    return interpolateTemplate(template, {
      customerName: tx.customerName,
      amount: tx.amount,
      productName: tx.productName,
      notes: tx.notes,
      checkoutLink: mockLink
    });
  };

  // Metrics animations variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } }
  };

  return (
    <section className="tab-content active" id="tab-dashboard">
      <span className="section-index">01. OVERVIEW / BATCH STATUS</span>
      
      {/* Metrics Header Grid */}
      <motion.div 
        className="metrics-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants} className="metric-card" id="metric-failed-revenue">
          <div className="metric-header">
            <span className="metric-title">Revenue at Risk</span>
            <div className="metric-icon-box risk">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
          </div>
          <div className="metric-value">₹{formatCurrency(failedTotal)}</div>
          <div className="metric-footer">
            <span className="metric-desc">Total Failed Transactions</span>
            <span className="metric-count" id="count-failed-tx">{failedCount}</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="metric-card" id="metric-recovered-revenue">
          <div className="metric-header">
            <span className="metric-title">Recovered Revenue</span>
            <div className="metric-icon-box recovered">
              <i className="fa-solid fa-circle-check" />
            </div>
          </div>
          <div className="metric-value text-recovered">₹{formatCurrency(recoveredTotal)}</div>
          <div className="metric-footer">
            <span className="metric-desc">Recovered Payments</span>
            <span className="metric-count text-recovered" id="count-recovered-tx">{recoveredCount}</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="metric-card" id="metric-recovery-rate">
          <div className="metric-header">
            <span className="metric-title">Recovery Rate</span>
            <div className="metric-icon-box rate">
              <i className="fa-solid fa-chart-pie" />
            </div>
          </div>
          <div className="metric-value text-rate">{recoveryRate.toFixed(1)}%</div>
          <div className="metric-footer">
            <div className="progress-bar-container">
              <div className="progress-bar" id="progress-recovery-rate" style={{ width: `${recoveryRate}%` }} />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="metric-card" id="metric-active-interventions">
          <div className="metric-header">
            <span className="metric-title">Active Retries</span>
            <div className="metric-icon-box active-retries">
              <i className="fa-solid fa-arrows-spin fa-spin" />
            </div>
          </div>
          <div className="metric-value">{activeRetries}</div>
          <div className="metric-footer">
            <span className="metric-desc">In Recovery Pipeline</span>
            <span className="metric-trend text-warning"><i className="fa-solid fa-clock" /> Live Nudges</span>
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

      {/* Main split */}
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
                  <th>Failure Root Cause</th>
                  <th>Status</th>
                  <th>Action</th>
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
                          <button 
                            className="btn btn-outline btn-sm inspect-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTxId(tx.id);
                            }}
                          >
                            Inspect
                          </button>
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

        {/* Right Side Drawer / Details Panel */}
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
                  <i className="fa-solid fa-microchip-ai" />
                </div>
                <h3>AI Agent Auditor</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Select any failed transaction from the log to audit the AI's diagnostic reasoning, view communication drafts, and trace the recovery pipeline.</p>
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
                    <span className="section-index">03. AUDIT PANEL</span>
                    <h3 className="detail-title" id="ins-customer-name">{selectedTx.customerName}</h3>
                    <span className="inspector-id" id="ins-tx-id" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{selectedTx.id}</span>
                  </div>
                  <span className={`status-badge ${selectedTx.status.toLowerCase()}`} id="ins-status-badge">
                    {selectedTx.status}
                  </span>
                </div>

                <div style={{ padding: '24px 0' }}>
                  <div className="info-grid" style={{ marginBottom: '24px' }}>
                    <div className="info-item">
                      <strong>Product / Service</strong>
                      <span id="ins-product-name">{selectedTx.productName}</span>
                    </div>
                    <div className="info-item">
                      <strong>Payment Amount</strong>
                      <span id="ins-amount" style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>₹{formatCurrency(selectedTx.amount)}</span>
                    </div>
                    <div className="info-item">
                      <strong>Phone / Email</strong>
                      <span>{selectedTx.phone} / {selectedTx.email}</span>
                    </div>
                  </div>

                  {/* RCA */}
                  <div className="timeline-section">
                    <h4 className="section-title" style={{ fontSize: '12px', marginBottom: '12px' }}>
                      <i className="fa-solid fa-magnifying-glass-chart" /> 03.1 AI DIAGNOSIS & RCA
                    </h4>
                    <div className="preview-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '10px' }}>ERROR CODE:</span>
                        <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{selectedTx.initialErrorCode}</code>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{selectedTx.notes}</p>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Strategy: <span style={{ color: 'var(--color-primary)' }}>
                          {selectedTx.failureType.includes('invoice_overdue') ? 'B2B Receivables Chaser - Net Credit Email Escalations' :
                           selectedTx.failureType === 'card_declined_insufficient_funds' ? 'WhatsApp Link + Smart Retries' : 
                           selectedTx.failureType === 'checkout_abandoned' ? 'Dynamic Nudge + Micro-discount Offer' : 
                           selectedTx.failureType === 'mandate_registration_failed' ? 'UPI Autopay Migration Campaign' : 
                           'WhatsApp Checkout Link + Dynamic Escalations'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="timeline-section">
                    <h4 className="section-title" style={{ fontSize: '12px', marginBottom: '12px' }}>
                      <i className="fa-solid fa-clock-rotate-left" /> 03.2 WORKFLOW AUDIT TRAIL
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

                  {/* Outbox preview */}
                  <div className="timeline-section">
                    <h4 className="section-title" style={{ fontSize: '12px', marginBottom: '12px' }}>
                      <i className="fa-solid fa-paper-plane" /> 03.3 COMMUNICATION OUTBOX
                    </h4>
                    <div className="preview-box swiss-diagonal" style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '6px', color: 'var(--color-primary)' }}>
                        CHANNEL: {selectedTx.recoveryChannel.toUpperCase()}
                      </div>
                      <p style={{ fontSize: '11px', lineHeight: '1.4' }}>
                        {getMockMessage(selectedTx).split(`rpy.to/rec_${selectedTx.id}`).map((part, index, arr) => (
                          <React.Fragment key={index}>
                            {part}
                            {index < arr.length - 1 && (
                              <a 
                                href="#" 
                                className="wa-checkout-link" 
                                id="ins-mock-link"
                                onClick={(e) => {
                                  e.preventDefault();
                                  onSwitchToPlayground(selectedTx);
                                }}
                              >
                                rpy.to/rec_{selectedTx.id}
                              </a>
                            )}
                          </React.Fragment>
                        ))}
                      </p>
                    </div>

                    <div className="action-buttons" style={{ marginTop: '16px' }}>
                      {selectedTx.status === 'Failed' || selectedTx.status === 'Recovering' ? (
                        <>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => onNudge(selectedTx.id)}
                          >
                            Force Nudge
                          </button>
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => onEscalate(selectedTx.id)}
                          >
                            Escalate Fail
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-outline btn-sm" style={{ gridColumn: 'span 2' }} disabled>
                          Action Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Promise-to-Pay Audit Panel */}
      <motion.div 
        className="card ptp-audit-card swiss-grid-pattern"
        style={{ marginTop: '24px' }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="card-header" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <span className="section-index">04. PROMISE-TO-PAY AUDIT LEDGER</span>
            <h2>Active Payment Commitments</h2>
            <p>Reminders are temporarily silenced for accounts with registered payment dates.</p>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: '20px' }}>
          {batchData.filter(tx => tx.ptpDate).length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <i className="fa-regular fa-calendar-check" style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.6 }} />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No active payment promises registered.</p>
            </div>
          ) : (
            <div className="ptp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {batchData.filter(tx => tx.ptpDate).map(tx => {
                const daysRemaining = Math.max(0, Math.ceil((new Date(tx.ptpDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                return (
                  <div key={tx.id} className="ptp-card" style={{
                    border: '2px solid var(--border-color)',
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="tag" style={{
                        backgroundColor: 'var(--color-primary)',
                        color: '#000',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        textTransform: 'uppercase',
                        borderRadius: '0'
                      }}>
                        {tx.recoveryChannel} PTP
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 'bold' }}>{tx.id}</span>
                    </div>

                    <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>{tx.customerName}</h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'var(--text-muted)' }}>{tx.productName}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount Due</span>
                        <strong style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>₹{formatCurrency(tx.amount)}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Promised Date</span>
                        <strong style={{ fontSize: '12px', color: 'var(--color-primary)' }}>{tx.ptpDate} ({daysRemaining}d)</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary btn-xs" 
                        style={{ flex: 1, fontSize: '9px' }}
                        onClick={() => onSwitchToPlayground(tx)}
                      >
                        Open Sandbox
                      </button>
                      <button 
                        className="btn btn-outline btn-xs" 
                        style={{ flex: 1, fontSize: '9px' }}
                        onClick={() => onNudge(tx.id)}
                      >
                        Nudge Early
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Add Failed Payment Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-primary, #FFFFFF)',
            border: '3px solid var(--border-color, #012652)',
            boxShadow: '8px 8px 0px var(--border-color, #012652)',
            maxWidth: '540px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--color-primary)' }}>
                  REVENUE RECOVERY PIPELINE
                </span>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>➕ Ingest Failed / Due Payment</h2>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            {/* Presets */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Quick Error Scenario Presets:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleApplyPreset('otp')}>
                  📱 OTP Timeout (Card)
                </button>
                <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleApplyPreset('balance')}>
                  💳 Insufficient Balance
                </button>
                <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleApplyPreset('upi_limit')}>
                  ⚡ UPI Limit Exceeded
                </button>
                <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleApplyPreset('gateway_503')}>
                  🏦 Bank 503 Downtime
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTransaction}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Customer Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    value={newCustName} 
                    onChange={e => setNewCustName(e.target.value)} 
                    placeholder="e.g. Aarav Mehta"
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Phone Number *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    value={newCustPhone} 
                    onChange={e => setNewCustPhone(e.target.value)} 
                    placeholder="+91 98765 12345"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={newCustEmail} 
                    onChange={e => setNewCustEmail(e.target.value)} 
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Amount Due (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    className="form-control" 
                    value={newAmount} 
                    onChange={e => setNewAmount(e.target.value)} 
                    placeholder="4499.00"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Product / Order Description</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newProduct} 
                  onChange={e => setNewProduct(e.target.value)} 
                  placeholder="e.g. Premium Annual SaaS Plan"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Failure Root Cause / Bank Error *</label>
                <textarea 
                  rows={2} 
                  className="form-control" 
                  value={newNotes} 
                  onChange={e => setNewNotes(e.target.value)} 
                  placeholder="e.g. 3D Secure verification timed out during bank checkout"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" id="btn-submit-new-failed-tx">
                  🚀 Ingest into Live Recovery Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
