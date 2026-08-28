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
  status: 'Failed' | 'Recovering' | 'Recovered' | 'Escalated';
  attempts: number;
  maxAttempts: number;
  recoveryChannel: 'WhatsApp' | 'Email' | 'SMS';
  notes: string;
  ptpDate?: string;
  merchantId?: string;
  recoveryLink?: string;
  discountApplied?: number;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  source: 'SYSTEM' | 'AGENT' | 'WEBHOOK' | 'PLAYGROUND' | 'COMPLIANCE' | 'CONFIG' | 'SIMULATOR' | 'OPTIMIZER' | 'SECURITY';
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
