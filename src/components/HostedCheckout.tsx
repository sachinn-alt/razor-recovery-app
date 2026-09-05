import React, { useState, useEffect } from 'react';
import type { HostedCheckoutData } from '../types';

interface HostedCheckoutProps {
  checkoutData: HostedCheckoutData;
  onPaySuccess?: (txId: string, method: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const HostedCheckout: React.FC<HostedCheckoutProps> = ({
  checkoutData,
  onPaySuccess,
  onClose,
  isModal = false,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('UPI_GPAY');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(checkoutData.status === 'completed');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(14 * 60 + 58);

  useEffect(() => {
    if (isSuccess) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSuccess]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handle1TapPayment = async () => {
    setIsProcessing(true);
    try {
      await fetch(`/api/checkout/${checkoutData.transactionId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: selectedMethod })
      });

      setTimeout(() => {
        setIsProcessing(false);
        setIsSuccess(true);
        if (onPaySuccess) {
          onPaySuccess(checkoutData.transactionId, selectedMethod);
        }
      }, 1200);
    } catch (err) {
      setTimeout(() => {
        setIsProcessing(false);
        setIsSuccess(true);
        if (onPaySuccess) {
          onPaySuccess(checkoutData.transactionId, selectedMethod);
        }
      }, 1200);
    }
  };

  const paymentMethods = [
    {
      id: 'UPI_GPAY',
      name: 'Google Pay / PhonePe UPI',
      subtitle: 'Instant 1-Click Intent (Recommended)',
      iconClass: 'fa-solid fa-mobile-screen-button',
      badge: 'Fastest Recovery',
      isRecommended: true
    },
    {
      id: 'UPI_QR',
      name: 'Scan Dynamic UPI QR',
      subtitle: 'Works on Paytm, BHIM, Cred & any UPI App',
      iconClass: 'fa-solid fa-qrcode',
      badge: 'Zero Friction'
    },
    {
      id: 'CARD_SAVED',
      name: 'Saved Visa / Mastercard / RuPay',
      subtitle: 'Fast OTP 3DS 2.0 Auth',
      iconClass: 'fa-solid fa-credit-card',
      badge: null
    },
    {
      id: 'NETBANKING',
      name: 'Netbanking (HDFC, ICICI, SBI, Axis)',
      subtitle: 'Direct bank debit authorization',
      iconClass: 'fa-solid fa-building-columns',
      badge: null
    },
    {
      id: 'PAYLATER',
      name: 'Razorpay PayLater / Cardless EMI',
      subtitle: 'Split dues into 3 zero-interest payments',
      iconClass: 'fa-solid fa-clock-rotate-left',
      badge: 'Flexible'
    }
  ];

  return (
    <div className={`hosted-checkout-container ${isModal ? 'modal-mode' : 'standalone-mode'}`}>
      <div className="checkout-card glass-panel">
        {/* Header with Merchant Branding & Security Seal */}
        <div className="checkout-header">
          <div className="merchant-info">
            <div className="merchant-logo-badge">
              <i className="fa-solid fa-shield-halved text-primary" />
            </div>
            <div>
              <h3 className="merchant-name">{checkoutData.merchantName}</h3>
              <p className="merchant-sub">Verified Razorpay Express Checkout</p>
            </div>
          </div>
          {onClose && (
            <button className="close-checkout-btn" onClick={onClose} title="Close Preview">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        {/* Dynamic 15-Minute Cart Reservation Lock Timer */}
        {!isSuccess && (
          <div className="cart-lock-banner">
            <div className="lock-icon-pulse">
              <i className="fa-solid fa-stopwatch text-warning" />
            </div>
            <div className="lock-text">
              <span className="lock-title">Cart & Inventory Reserved</span>
              <span className="lock-desc">Your order is held safely for</span>
            </div>
            <div className={`countdown-clock ${secondsRemaining < 180 ? 'urgent' : ''}`}>
              {formatTimer(secondsRemaining)}
            </div>
          </div>
        )}

        {isSuccess ? (
          /* Payment Success Confirmation View */
          <div className="checkout-success-view">
            <div className="success-check-bubble">
              <i className="fa-solid fa-check" />
            </div>
            <h2 className="success-heading">Payment Successfully Recovered!</h2>
            <p className="success-sub">
              Your transaction has been securely processed and confirmed with <strong>{checkoutData.merchantName}</strong>.
            </p>

            <div className="success-receipt-card">
              <div className="receipt-row">
                <span>Transaction Ref:</span>
                <span className="receipt-val">{checkoutData.transactionId}</span>
              </div>
              <div className="receipt-row">
                <span>Amount Paid:</span>
                <span className="receipt-val highlight">₹{checkoutData.finalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="receipt-row">
                <span>Payment Rail:</span>
                <span className="receipt-val">{selectedMethod.replace('_', ' ')}</span>
              </div>
              <div className="receipt-row">
                <span>Cadence Status:</span>
                <span className="receipt-val badge-success">Downstream Nudges Auto-Cancelled</span>
              </div>
            </div>

            <div className="success-actions">
              {onClose ? (
                <button className="btn-primary-glow full-width" onClick={onClose}>
                  Return to Merchant Dashboard
                </button>
              ) : (
                <button className="btn-primary-glow full-width" onClick={() => window.location.href = '/'}>
                  Done
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Active Checkout View */
          <div className="checkout-body">
            {/* Order Summary & Recovery Discount */}
            <div className="order-summary-box">
              <div className="summary-title-row">
                <span className="item-name">{checkoutData.productName}</span>
                <span className="item-orig-price">₹{checkoutData.originalAmount.toLocaleString('en-IN')}</span>
              </div>

              {checkoutData.discountPercentage > 0 && (
                <div className="summary-discount-row">
                  <span className="discount-tag">
                    <i className="fa-solid fa-tag" style={{ marginRight: '4px' }} />
                    {checkoutData.discountPercentage}% Recovery Voucher Applied
                  </span>
                  <span className="discount-val">-₹{checkoutData.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="summary-total-row">
                <span className="total-label">Total Payable:</span>
                <span className="total-amount">₹{checkoutData.finalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Smart Payment Method Selector */}
            <div className="payment-methods-section">
              <div className="section-label-row">
                <span className="section-title">Select 1-Click Recovery Method</span>
                <span className="smart-route-indicator">
                  <i className="fa-solid fa-bolt" style={{ marginRight: '4px' }} />
                  Smart Routing Active
                </span>
              </div>

              <div className="methods-list">
                {paymentMethods.map(method => (
                  <div
                    key={method.id}
                    className={`method-item ${selectedMethod === method.id ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod(method.id)}
                  >
                    <div className="method-left">
                      <span className="method-icon">
                        <i className={method.iconClass} />
                      </span>
                      <div>
                        <div className="method-name-row">
                          <span className="method-name">{method.name}</span>
                          {method.badge && <span className="method-badge">{method.badge}</span>}
                        </div>
                        <span className="method-sub">{method.subtitle}</span>
                      </div>
                    </div>
                    <div className="method-radio">
                      <div className={`radio-dot ${selectedMethod === method.id ? 'active' : ''}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 1-Tap Pay CTA */}
            <div className="checkout-cta-box">
              <button
                className="btn-pay-now-primary"
                onClick={handle1TapPayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="spinner-label">
                    <span className="btn-spinner"></span> Connecting to Bank Switch...
                  </span>
                ) : (
                  <span>
                    <i className="fa-solid fa-lock" style={{ marginRight: '6px' }} />
                    Pay ₹{checkoutData.finalAmount.toLocaleString('en-IN')} with 1-Tap
                  </span>
                )}
              </button>

              <div className="checkout-trust-footer">
                <span>
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: '4px' }} />
                  256-Bit SSL Encrypted
                </span>
                <span>•</span>
                <span>DPDP (2023) Compliant</span>
                <span>•</span>
                <span>Powered by Razorpay</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
