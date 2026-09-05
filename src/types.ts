export interface Transaction {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  amount: number;
  productName: string;
  timestamp: string;
  failureType: 'card_declined_insufficient_funds' | 'network_timeout' | 'checkout_abandoned' | 'authentication_failed' | 'mandate_registration_failed' | 'invoice_overdue_net15' | 'invoice_overdue_net30' | 'invoice_overdue_net45';
  initialErrorCode: string;
  status: 'Failed' | 'Recovering' | 'Recovered' | 'Escalated' | 'Reconciled';
  attempts: number;
  maxAttempts: number;
  recoveryChannel: 'WhatsApp' | 'Email' | 'SMS' | 'In-App';
  notes: string;
  ptpDate?: string;
  merchantId?: string;
  recoveryLink?: string;
  discountApplied?: number;
  cartExpiresAt?: string;
  reconciledUtr?: string;
  cadenceStage?: number;
  resolvedMethod?: string;
  paymentMethod?: string;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  source: 'SYSTEM' | 'AGENT' | 'WEBHOOK' | 'PLAYGROUND' | 'COMPLIANCE' | 'CONFIG' | 'SIMULATOR' | 'OPTIMIZER' | 'SECURITY' | 'CADENCE' | 'RECONCILIATION';
  message: string;
  type: 'info' | 'debug' | 'success' | 'warning' | 'error';
}

export interface ChatState {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  failureReason?: string;
  amount: number;
  originalAmount: number;
  productName: string;
  discountApplied: boolean;
  paymentMethod: string;
  currentTxId: string;
  optedOut: boolean;
  status: string;
  optimizerRecommendation?: {
    recommendedRoute: string;
    confidenceScore: number;
    recoveryStrategy: string;
    estimatedSuccessLift: string;
  };
}

export interface ComplianceStatus {
  hmacWebhookVerification: string;
  idempotencyDefense: string;
  dpdpPiiMasking: string;
  databaseEngine: string;
  maxDiscountCap: string;
  pciDssBoundaries: string;
  geminiAiGuardrails: string;
}

export interface DripStep {
  id: string;
  transactionId: string;
  stepNumber: number;
  offsetMinutes: number;
  channel: 'In-App' | 'WhatsApp' | 'SMS' | 'Email';
  title: string;
  messagePreview: string;
  status: 'pending' | 'sent' | 'delivered' | 'cancelled_paid' | 'skipped';
  scheduledTime: string;
  executedAt?: string;
  discountOffered?: number;
}

export interface BankHealthItem {
  code: string;
  name: string;
  type: 'UPI' | 'Cards' | 'Netbanking' | 'Wallet';
  successRate: number; // percentage (e.g. 98.4)
  avgLatencyMs: number;
  status: 'Healthy' | 'Degraded' | 'Down';
  trend: 'improving' | 'stable' | 'degrading';
  recommendation?: string;
}

export interface ReconciliationRecord {
  id: string;
  transactionId: string;
  customerName: string;
  amount: number;
  bankName: string;
  utrNumber: string;
  arnNumber: string;
  status: 'Auto-Reconciled' | 'Under-Investigation' | 'Refunded';
  detectedAt: string;
  resolvedAt: string;
  whatsappNoticeSent: boolean;
}

export interface HostedCheckoutData {
  transactionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  originalAmount: number;
  discountPercentage: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  cartExpiresAt: string;
  recommendedMethod: string;
  status: 'active' | 'expired' | 'completed';
  merchantName: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Finance Lead' | 'Support Operator' | string;
  merchantId: string;
  mfaEnabled?: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface SessionInfo {
  token: string;
  user: AuthUser;
  expiresAt: string;
  encryption: string;
  issuer: string;
}
