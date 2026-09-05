import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { LogTerminal } from './components/LogTerminal';
import { DashboardTab } from './components/DashboardTab';
import { SimulatorTab } from './components/SimulatorTab';
import { PlaygroundTab } from './components/PlaygroundTab';
import { SettingsTab } from './components/SettingsTab';
import { HostedCheckout } from './components/HostedCheckout';
import { LoginPage } from './components/LoginPage';
import { UserProfileMenu } from './components/UserProfileMenu';

import type { Transaction, AgentLog, ChatState, AuthUser, SessionInfo } from './types';
import { useBatchSimulator } from './hooks/useBatchSimulator';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
  const [directPayTxId, setDirectPayTxId] = useState<string | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    const checkActiveSession = async () => {
      const token = localStorage.getItem('razor_auth_token') || sessionStorage.getItem('razor_auth_token');
      if (!token) {
        setIsCheckingSession(false);
        setIsAuthenticated(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          setCurrentUser(data.user);
          setIsAuthenticated(true);
        } else {
          // Token invalid / expired
          localStorage.removeItem('razor_auth_token');
          sessionStorage.removeItem('razor_auth_token');
          setIsAuthenticated(false);
        }
      } catch (err) {
        // Fallback to local stored user if offline
        const storedUser = localStorage.getItem('razor_auth_user') || sessionStorage.getItem('razor_auth_user');
        if (storedUser) {
          try {
            setCurrentUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } catch {
            setIsAuthenticated(false);
          }
        }
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkActiveSession();
  }, []);

  // Check URL hash or search params for standalone /pay/:id route
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payQuery = params.get('pay');
    const hash = window.location.hash;

    if (payQuery) {
      setDirectPayTxId(payQuery);
    } else if (hash.startsWith('#pay/')) {
      setDirectPayTxId(hash.replace('#pay/', ''));
    }
  }, []);

  // Terminal logs
  const [logs, setLogs] = useState<AgentLog[]>([
    {
      id: 'log_init_1',
      timestamp: new Date().toLocaleTimeString(),
      source: 'SYSTEM',
      message: 'RazorRecovery Enterprise Platform initialized with Drip Cadence & Bank Radar.',
      type: 'info'
    },
    {
      id: 'log_init_2',
      timestamp: new Date().toLocaleTimeString(),
      source: 'SYSTEM',
      message: 'SQLite WAL database & 1-Click Hosted Micro-Checkout endpoints active.',
      type: 'info'
    }
  ]);

  const addLog = (
    source: AgentLog['source'],
    message: string,
    type: AgentLog['type'] = 'info'
  ) => {
    setLogs(prev => [
      ...prev,
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toLocaleTimeString(),
        source,
        message,
        type
      }
    ]);
  };

  const clearLogs = () => {
    setLogs([
      {
        id: `log_clear_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'SYSTEM',
        message: 'Log terminal buffer cleared by operator.',
        type: 'info'
      }
    ]);
  };

  const [visaOutage, setVisaOutage] = useState<boolean>(false);
  const [mastercardOutage, setMastercardOutage] = useState<boolean>(false);
  const [upiOutage, setUpiOutage] = useState<boolean>(false);

  // Settings
  const [systemPrompt, setSystemPrompt] = useState<string>(
    `You are RazorRecovery, an automated collection and revenue recovery assistant for Acme India Corp.\nYour tone is helpful, compliant, polite, and reassuring.\nExplain why the payment failed using natural language.\nProvide the secure checkout link.\nOffer alternative payment methods if requested.\nMaintain professional compliance; do not spam or make aggressive demands.\nStop immediately if the customer requests to opt-out or stop messages.`
  );
  const [maxRetries, setMaxRetries] = useState<number>(3);
  const [maxDiscount, setMaxDiscount] = useState<number>(5);
  const [waTemplate, setWaTemplate] = useState<string>(
    "Hi {{customerName}}, we noticed your payment of ₹{{amount}} for {{productName}} failed due to: {{notes}}. Complete checkout instantly here: {{checkoutLink}}"
  );
  const [emailTemplate, setEmailTemplate] = useState<string>(
    "Subject: Action Required: Payment Failed for {{productName}}\n\nDear {{customerName}},\n\nYour transaction of ₹{{amount}} for {{productName}} declined due to the following reason: {{notes}}.\n\nTo restore service or finalize your purchase, click here: {{checkoutLink}}"
  );
  const [smsTemplate, setSmsTemplate] = useState<string>(
    "Alert: Payment of Rs. {{amount}} failed for {{productName}}. Secure checkout link: {{checkoutLink}}"
  );

  // Custom recovery simulator hook
  const {
    simState,
    simDelay,
    setSimDelay,
    exceptions,
    batchData,
    setBatchData,
    chartHistory,
    startSimulation,
    pauseSimulation,
    resetSimulation,
  } = useBatchSimulator({
    maxRetries,
    visaOutage,
    mastercardOutage,
    upiOutage,
    addLog,
    waTemplate,
    emailTemplate,
    smsTemplate
  });

  const [chatState, setChatState] = useState<ChatState>({
    customerName: 'Rahul Sharma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'rahul.sharma@example.com',
    failureReason: '3D Secure OTP verification timed out on customer device',
    amount: 4499.00,
    originalAmount: 4499.00,
    productName: 'Annual Pro Subscription',
    discountApplied: false,
    paymentMethod: 'credit_card',
    currentTxId: 'pay_rec_1001',
    optedOut: false,
    status: 'Failed'
  });

  const updateTransactionStatus = (
    id: string,
    status: Transaction['status'],
    notes: string,
    recoveredAmt?: number,
    ptpDate?: string
  ) => {
    setBatchData(prev =>
      prev.map(tx => {
        if (tx.id === id) {
          const updated = {
            ...tx,
            status,
            notes: notes || tx.notes,
            attempts: tx.attempts + 1,
            ptpDate: ptpDate || tx.ptpDate
          };
          if (status === 'Recovered' && recoveredAmt) {
            addLog('AGENT', `Order recovered for ${tx.customerName}: ₹${recoveredAmt.toFixed(2)} [${id}] via 1-Tap Recovery.`, 'success');
          }
          return updated;
        }
        return tx;
      })
    );
  };

  const handleManualNudge = (id: string) => {
    setBatchData(prev =>
      prev.map(tx => {
        if (tx.id === id) {
          addLog('CADENCE', `Dispatched next cadence nudge to ${tx.customerName} for ${tx.id}`, 'warning');
          return {
            ...tx,
            status: 'Recovering' as const,
            attempts: tx.attempts + 1
          };
        }
        return tx;
      })
    );
  };

  const handleManualEscalate = (id: string) => {
    setBatchData(prev =>
      prev.map(tx => {
        if (tx.id === id) {
          addLog('AGENT', `Escalating transaction ${tx.id} for manual merchant review`, 'error');
          return {
            ...tx,
            status: 'Escalated' as const
          };
        }
        return tx;
      })
    );
  };

  const handleSwitchToPlayground = (tx: Transaction) => {
    setChatState({
      customerName: tx.customerName,
      customerEmail: tx.email,
      customerPhone: tx.phone,
      failureReason: tx.notes || 'Payment processing failure',
      amount: tx.amount,
      originalAmount: tx.amount,
      productName: tx.productName,
      discountApplied: false,
      paymentMethod: 'upi',
      currentTxId: tx.id,
      optedOut: false,
      status: tx.status
    });
    setActiveTab('playground');
    addLog('PLAYGROUND', `Loaded customer dues context for ${tx.customerName} (${tx.id}) into WhatsApp chat.`, 'info');
  };

  const handlePaymentSuccess = (recoveredAmt: number) => {
    addLog('PLAYGROUND', `Customer finalized payment. Captured transaction value: ₹${recoveredAmt.toFixed(2)}`, 'success');
  };

  const handleAddTransaction = (newTx: Transaction) => {
    setBatchData(prev => [newTx, ...prev]);
    addLog('SYSTEM', `Injected new failed transaction: ${newTx.customerName} (₹${newTx.amount.toFixed(2)}) [${newTx.id}] into recovery pipeline.`, 'info');
  };

  const handleLoginSuccess = (session: SessionInfo) => {
    setCurrentUser(session.user);
    setIsAuthenticated(true);
    addLog('SECURITY', `Authenticated session established for ${session.user.name} (${session.user.role}). Vault active.`, 'success');
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('razor_auth_token') || sessionStorage.getItem('razor_auth_token');
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch {
      // ignore network logout errors
    } finally {
      localStorage.removeItem('razor_auth_token');
      localStorage.removeItem('razor_auth_user');
      sessionStorage.removeItem('razor_auth_token');
      sessionStorage.removeItem('razor_auth_user');
      setCurrentUser(null);
      setIsAuthenticated(false);
      addLog('SECURITY', 'User session terminated. Terminal locked.', 'warning');
    }
  };

  const handleLockSession = () => {
    setIsAuthenticated(false);
    addLog('SECURITY', 'Workstation session locked by operator.', 'info');
  };

  const handleSwitchPersona = async (persona: 'admin' | 'finance' | 'operator') => {
    try {
      const res = await fetch('/api/auth/quick-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('razor_auth_token', data.token);
        localStorage.setItem('razor_auth_user', JSON.stringify(data.user));
        addLog('SECURITY', `Role switched to ${data.user.role} (${data.user.name}) with renewed HMAC token.`, 'info');
      }
    } catch (err: any) {
      addLog('SECURITY', `Failed to switch role: ${err.message}`, 'error');
    }
  };

  const processedCount = batchData.filter(t => t.status === 'Recovered' || t.status === 'Escalated').length;

  // Session verification loading splash
  if (isCheckingSession) {
    return (
      <div className="auth-loading-splash">
        <div className="splash-card">
          <div className="splash-logo">
            <i className="fa-solid fa-shield-halved fa-spin" />
          </div>
          <h3>Verifying Security Token...</h3>
          <p>Initialising Zero-Trust Cryptographic Channel</p>
        </div>
      </div>
    );
  }

  // Gate the console behind the Login Page
  if (!isAuthenticated || !currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Render standalone customer recovery checkout if accessed via direct link
  if (directPayTxId) {
    const directTx = batchData.find(t => t.id === directPayTxId) || {
      id: directPayTxId,
      customerName: 'Valued Customer',
      email: 'customer@example.com',
      phone: '+919876543210',
      productName: 'Acme India Order #' + directPayTxId.slice(-4),
      amount: 4499.00,
      status: 'Failed' as const
    };

    return (
      <HostedCheckout
        isModal={false}
        checkoutData={{
          transactionId: directTx.id,
          customerName: directTx.customerName,
          customerEmail: directTx.email,
          customerPhone: directTx.phone,
          productName: directTx.productName,
          originalAmount: directTx.amount,
          discountPercentage: 5,
          discountAmount: (directTx.amount * 5) / 100,
          finalAmount: Math.round(directTx.amount * 0.95),
          currency: 'INR',
          cartExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
          recommendedMethod: 'UPI Intent (Google Pay / PhonePe)',
          status: directTx.status === 'Recovered' ? 'completed' : 'active',
          merchantName: 'Acme India Corp'
        }}
        onPaySuccess={(txId, method) => {
          updateTransactionStatus(txId, 'Recovered', `Paid via ${method}`, directTx.amount);
        }}
        onClose={() => {
          setDirectPayTxId(null);
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <div className={`app-container ${isSidebarHovered ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isHovered={isSidebarHovered}
        setIsHovered={setIsSidebarHovered}
      />

      <main className="main-content">
        <header className="header">
          <div className="header-title">
            <h1 id="main-heading">Revenue Recovery Console</h1>
            <p className="header-subtitle">Real-time payment failure diagnosis & autonomous recovery campaigns.</p>
          </div>

          <div className="header-actions">
            <div className="simulator-quick-controls">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setActiveTab('simulator'); startSimulation(); }}
                disabled={simState === 'running'}
                id="quick-start-sim"
              >
                <i className="fa-solid fa-play" /> Run Batch Sim
              </button>
            </div>

            <UserProfileMenu
              user={currentUser}
              onLogout={handleLogout}
              onLockSession={handleLockSession}
              onSwitchPersona={handleSwitchPersona}
            />
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <DashboardTab
            batchData={batchData}
            chartHistory={chartHistory}
            selectedTxId={selectedTxId}
            setSelectedTxId={setSelectedTxId}
            onNudge={handleManualNudge}
            onEscalate={handleManualEscalate}
            onSwitchToPlayground={handleSwitchToPlayground}
            onAddTransaction={handleAddTransaction}
            waTemplate={waTemplate}
            emailTemplate={emailTemplate}
            smsTemplate={smsTemplate}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorTab
            simState={simState}
            startSimulation={startSimulation}
            pauseSimulation={pauseSimulation}
            resetSimulation={resetSimulation}
            simDelay={simDelay}
            setSimDelay={setSimDelay}
            batchData={batchData}
            processedCount={processedCount}
            recoveredCount={batchData.filter(t => t.status === 'Recovered').length}
            escalatedCount={batchData.filter(t => t.status === 'Escalated').length}
            exceptions={exceptions}
            visaOutage={visaOutage}
            setVisaOutage={setVisaOutage}
            mastercardOutage={mastercardOutage}
            setMastercardOutage={setMastercardOutage}
            upiOutage={upiOutage}
            setUpiOutage={setUpiOutage}
          />
        )}

        {activeTab === 'playground' && (
          <PlaygroundTab
            chatState={chatState}
            setChatState={setChatState}
            batchData={batchData}
            onPaymentSuccess={handlePaymentSuccess}
            addLog={addLog}
            updateTransactionStatus={updateTransactionStatus}
            visaOutage={visaOutage}
            mastercardOutage={mastercardOutage}
            upiOutage={upiOutage}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            maxRetries={maxRetries}
            setMaxRetries={setMaxRetries}
            maxDiscount={maxDiscount}
            setMaxDiscount={setMaxDiscount}
            addLog={addLog}
            waTemplate={waTemplate}
            setWaTemplate={setWaTemplate}
            emailTemplate={emailTemplate}
            setEmailTemplate={setEmailTemplate}
            smsTemplate={smsTemplate}
            setSmsTemplate={setSmsTemplate}
          />
        )}

        <LogTerminal logs={logs} clearLogs={clearLogs} />
      </main>
    </div>
  );
};

export default App;
