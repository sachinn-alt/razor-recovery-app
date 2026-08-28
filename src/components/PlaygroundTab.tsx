import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Transaction, ChatState } from '../types';

interface PlaygroundTabProps {
  chatState: ChatState;
  setChatState: React.Dispatch<React.SetStateAction<ChatState>>;
  batchData?: Transaction[];
  onPaymentSuccess: (amount: number) => void;
  addLog: (source: 'SYSTEM' | 'AGENT' | 'WEBHOOK' | 'PLAYGROUND' | 'COMPLIANCE' | 'CONFIG', message: string, type?: 'info' | 'debug' | 'success' | 'warning' | 'error') => void;
  updateTransactionStatus: (id: string, status: 'Failed' | 'Recovering' | 'Recovered' | 'Escalated', notes: string, recoveredAmt?: number, ptpDate?: string) => void;
  visaOutage: boolean;
  mastercardOutage: boolean;
  upiOutage: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'received' | 'sent' | 'system';
  text: string;
  timestamp: string;
  isVoice?: boolean;
}

export const PlaygroundTab: React.FC<PlaygroundTabProps> = ({
  chatState,
  setChatState,
  batchData = [],
  onPaymentSuccess,
  addLog,
  updateTransactionStatus,
  visaOutage,
  mastercardOutage,
  upiOutage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replies, setReplies] = useState<{ id: string; label: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'pay_form' | 'success'>('idle');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiSubMode, setUpiSubMode] = useState<'qr' | 'vpa'>('qr');
  const [simulatingQrScan, setSimulatingQrScan] = useState(false);
  const [qrTimer, setQrTimer] = useState('04:59');
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [optimizerInfo, setOptimizerInfo] = useState<{
    recommendedRoute: string;
    confidenceScore: number;
    recoveryStrategy: string;
    estimatedSuccessLift: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const customerName = chatState.customerName || 'Customer';
  const vpa = `${customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@okaxis`;

  // Fetch Razorpay Optimizer intelligent fallback strategy
  useEffect(() => {
    fetch('http://localhost:3001/api/optimizer/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        failureCode: chatState.failureReason || 'BAD_REQUEST_AUTHENTICATION_FAILED',
        paymentMethod: chatState.paymentMethod || 'card',
        amount: chatState.amount
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.recommendation) {
          setOptimizerInfo(data.recommendation);
        }
      })
      .catch(() => {});
  }, [chatState.currentTxId, chatState.failureReason]);

  // Simulated QR timer countdown
  useEffect(() => {
    let secondsLeft = 299;
    const interval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) secondsLeft = 299;
      const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
      const secs = (secondsLeft % 60).toString().padStart(2, '0');
      setQrTimer(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSimulateQrScan = () => {
    if (simulatingQrScan || loadingPayment) return;
    setSimulatingQrScan(true);
    addLog('WEBHOOK', `[UPI QR Simulator] Dynamic QR Code scanned by ${customerName} (Google Pay / PhonePe). Verifying MPIN...`, 'info');

    setTimeout(() => {
      setSimulatingQrScan(false);
      handleCheckoutSubmit();
    }, 1600);
  };

  // Switch customer from failed transactions dropdown
  const handleSelectCustomer = (txId: string) => {
    const selected = batchData.find(t => t.id === txId);
    if (selected) {
      setChatState({
        customerName: selected.customerName,
        customerEmail: selected.email,
        customerPhone: selected.phone,
        failureReason: selected.notes || 'Transaction verification declined by issuing bank',
        amount: selected.amount,
        originalAmount: selected.amount,
        productName: selected.productName,
        discountApplied: false,
        paymentMethod: 'upi',
        currentTxId: selected.id,
        optedOut: false,
        status: selected.status
      });
      addLog('PLAYGROUND', `Switched active chat dues context to customer: ${selected.customerName} (${selected.id})`, 'info');
    }
  };

  // Initialize/reset chat based on current customer and dues
  useEffect(() => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentName = chatState.customerName || 'Customer';
    const reasonText = chatState.failureReason || 'an OTP verification timeout during checkout';

    setMessages([
      {
        id: `msg_fail_init_${Date.now()}`,
        sender: 'received',
        text: `Hi <strong>${currentName}</strong>, we noticed your payment of <strong>₹${chatState.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> for <strong>${chatState.productName}</strong> was interrupted (${reasonText}).
        <br/><br/>
        No worries! We have saved your cart items. You can complete your secure checkout instantly using this Razorpay link: 
        <br/>
        <a href="#" class="wa-checkout-link" id="chat-link-init">rpy.to/rec_${chatState.currentTxId}</a>`,
        timestamp: timeStr,
      },
      {
        id: `msg_voice_${Date.now()}`,
        sender: 'received',
        text: 'Voice note assistant nudge',
        timestamp: timeStr,
        isVoice: true,
      }
    ]);

    setReplies([
      { id: 'otp_retry', label: '"I will try with the correct OTP now"' },
      { id: 'ask_upi', label: '"Can I pay via GPay / UPI instead?"' },
      { id: 'ask_discount', label: '"Can I get a discount?"' },
      { id: 'ptp_promise', label: '"I will clear the payment in 3 days"' },
      { id: 'stop_msg', label: '"STOP. Don\'t message me again"' },
    ]);

    setCheckoutVisible(false);
    setCheckoutStep('idle');
    setPaymentMethod('upi');
    setIsTyping(false);
  }, [chatState.currentTxId, chatState.customerName]);

  // Bind click listener for payment links inside chat bubbles
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.id === 'chat-link-init' || target.classList.contains('wa-checkout-link'))) {
        e.preventDefault();
        launchCheckout();
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => {
      document.removeEventListener('click', handleLinkClick);
    };
  }, [messages]);

  // Pre-load and track available browser voices
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setAvailableVoices(v);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const getBestIndianVoice = (): { voice: SpeechSynthesisVoice | null; isHindi: boolean } => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return { voice: null, isHindi: false };
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return { voice: null, isHindi: false };

    // 1. Microsoft Swara / Madhur Natural (Edge / Windows 11)
    const msNaturalHindi = voices.find(v => 
      (v.name.includes('Swara') || v.name.includes('Madhur')) && v.name.includes('Natural')
    );
    if (msNaturalHindi) return { voice: msNaturalHindi, isHindi: true };

    // 2. Google हिन्दी (Chrome)
    const googleHindi = voices.find(v => v.name.includes('Google हिन्दी') || (v.lang === 'hi-IN' && v.name.includes('Google')));
    if (googleHindi) return { voice: googleHindi, isHindi: true };

    // 3. Microsoft Neerja / Prabhat Online Natural (Indian English)
    const msNaturalIndianEng = voices.find(v => 
      (v.name.includes('Neerja') || v.name.includes('Prabhat')) && v.name.includes('Natural')
    );
    if (msNaturalIndianEng) return { voice: msNaturalIndianEng, isHindi: false };

    // 4. Any Hindi Voice
    const anyHindi = voices.find(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi') || v.name.includes('Swara') || v.name.includes('Kalpana') || v.name.includes('Hemant'));
    if (anyHindi) return { voice: anyHindi, isHindi: true };

    // 5. Any Indian English Voice (en-IN)
    const anyIndianEng = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Heera') || v.name.includes('Ravi'));
    if (anyIndianEng) return { voice: anyIndianEng, isHindi: false };

    return { voice: null, isHindi: false };
  };

  // Voice Note Synthesis using high-definition native Indian voice
  const handlePlayVoiceNote = () => {
    if (isAudioPlaying) {
      window.speechSynthesis.cancel();
      setIsAudioPlaying(false);
      return;
    }

    setIsAudioPlaying(true);
    const { voice: selectedVoice, isHindi } = getBestIndianVoice();

    // Natural phrasing matched to voice capability for clean pronunciation
    const spokenText = isHindi
      ? `नमस्ते ${customerName}! हमने देखा कि आपका पेमेंट पूरा नहीं हो पाया था। कृपया चिंता न करें, आप नीचे दिए गए लिंक से गूगल पे, फोनपे या कार्ड द्वारा आसानी से पेमेंट पूरा कर सकते हैं। धन्यवाद!`
      : `Hello ${customerName}! We noticed your payment of rupees ${Math.round(chatState.amount)} was interrupted. No worries, you can complete it instantly using your secure Razorpay UPI or card link. Thank you!`;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = isHindi ? 'hi-IN' : 'en-IN';
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsAudioPlaying(false);
      addLog('PLAYGROUND', `Voice Nudge playback finished for ${customerName}.`, 'debug');
    };

    utterance.onerror = () => {
      setIsAudioPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    const voiceLabel = selectedVoice ? selectedVoice.name : 'Native Indian Speech Engine';
    addLog('AGENT', `Playing Voice Note to ${customerName} using ${voiceLabel}`, 'info');
  };

  const launchCheckout = (method?: 'upi' | 'card' | 'netbanking') => {
    setCheckoutVisible(true);
    setCheckoutStep('pay_form');
    if (method) setPaymentMethod(method);
    addLog('WEBHOOK', `Checkout window opened for ${customerName} (₹${chatState.amount.toFixed(2)}).`, 'info');
  };

  // Handle custom user typed questions / messages
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isTyping || chatState.optedOut) return;

    const userText = inputText.trim();
    setInputText('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'sent',
      text: userText,
      timestamp: timeStr
    };
    setMessages(prev => [...prev, userMsg]);
    addLog('PLAYGROUND', `${customerName} asked: "${userText}"`, 'debug');

    setIsTyping(true);

    try {
      // Call live backend API with Gemini AI
      const response = await fetch('http://localhost:3001/api/recovery/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userText,
          transactionContext: {
            id: chatState.currentTxId,
            customerName: customerName,
            amount: chatState.amount,
            productName: chatState.productName,
            failureReason: chatState.failureReason || 'Bank authentication timeout'
          },
          conversationHistory: messages
        })
      });

      const data = await response.json();
      setIsTyping(false);

      if (data && data.reply) {
        // Format links in AI reply to be clickable
        const formattedReply = data.reply
          .replace(/(https?:\/\/[^\s]+)/g, '<a href="#" class="wa-checkout-link">$1</a>')
          .replace(/\[Razorpay (Payment|Instant UPI) Link\]/gi, `<a href="#" class="wa-checkout-link">⚡ Complete Razorpay Checkout (rpy.to/rec_${chatState.currentTxId})</a>`)
          .replace(/\[Payment Link\]/gi, `<a href="#" class="wa-checkout-link">⚡ Open Payment Link (rpy.to/rec_${chatState.currentTxId})</a>`)
          .replace(/\n/g, '<br/>');

        setMessages(prev => [...prev, {
          id: `bot_${Date.now()}`,
          sender: 'received',
          text: formattedReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        addLog('AGENT', `AI Agent (${data.source || 'gemini'}) replied to ${customerName}`, 'info');

        // Check if customer asked for discount and apply state update
        if (userText.toLowerCase().includes('discount') || userText.toLowerCase().includes('offer')) {
          if (!chatState.discountApplied) {
            const discountAmt = chatState.originalAmount * 0.05;
            const newAmt = chatState.originalAmount - discountAmt;
            setChatState(prev => ({ ...prev, discountApplied: true, amount: newAmt }));
            addLog('AGENT', `Applied 5% discount for ${customerName}. New total: ₹${newAmt.toFixed(2)}`, 'warning');
          }
        }
      }
    } catch (err) {
      setIsTyping(false);
      // Fallback response if offline
      const fallbackReply = `Hi ${customerName}, we are here to assist. You can complete your pending payment of ₹${chatState.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} instantly using this secure link: <br/><a href="#" class="wa-checkout-link">rpy.to/rec_${chatState.currentTxId}</a>`;
      setMessages(prev => [...prev, {
        id: `bot_${Date.now()}`,
        sender: 'received',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  // Quick reply chip handler
  const handleQuickReply = (replyId: string, labelText: string) => {
    const cleanText = labelText.replace(/^"|"$/g, '');
    setInputText(cleanText);
    setReplies(prev => prev.filter(r => r.id !== replyId));
    
    // Auto-trigger send
    setTimeout(() => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, {
        id: `user_${Date.now()}`,
        sender: 'sent',
        text: cleanText,
        timestamp: timeStr
      }]);
      addLog('PLAYGROUND', `${customerName} selected quick reply: "${cleanText}"`, 'debug');

      if (replyId === 'stop_msg') {
        setChatState(prev => ({ ...prev, optedOut: true, status: 'Escalated' }));
        setMessages(prev => [...prev, {
          id: `bot_${Date.now()}`,
          sender: 'received',
          text: `We have registered your opt-out request, ${customerName}. All automated reminders have been halted for this order. We apologize for the disturbance.`,
          timestamp: timeStr
        }]);
        updateTransactionStatus(chatState.currentTxId, 'Escalated', 'Customer opted out via WhatsApp.');
        setReplies([]);
        return;
      }

      if (replyId === 'ptp_promise') {
        const promiseDate = '2026-08-27';
        updateTransactionStatus(chatState.currentTxId, 'Recovering', `Customer promised to pay by ${promiseDate}`, undefined, promiseDate);
        setMessages(prev => [...prev, {
          id: `bot_${Date.now()}`,
          sender: 'received',
          text: `Thank you for confirming, ${customerName}! We have noted your promise-to-pay date for <strong>27th August 2026</strong>. Automated reminders are paused until then.`,
          timestamp: timeStr
        }]);
        return;
      }

      // Otherwise send to AI
      setIsTyping(true);
      fetch('http://localhost:3001/api/recovery/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: cleanText,
          transactionContext: {
            id: chatState.currentTxId,
            customerName: customerName,
            amount: chatState.amount,
            productName: chatState.productName,
            failureReason: chatState.failureReason
          },
          conversationHistory: messages
        })
      })
        .then(r => r.json())
        .then(data => {
          setIsTyping(false);
          const formatted = (data.reply || `Here is your payment link: https://rzp.io/i/rec_${chatState.currentTxId}`)
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="#" class="wa-checkout-link">$1</a>')
            .replace(/\[Razorpay (Payment|Instant UPI) Link\]/gi, `<a href="#" class="wa-checkout-link">⚡ Complete Razorpay Checkout (rpy.to/rec_${chatState.currentTxId})</a>`)
            .replace(/\[Payment Link\]/gi, `<a href="#" class="wa-checkout-link">⚡ Open Payment Link (rpy.to/rec_${chatState.currentTxId})</a>`)
            .replace(/\n/g, '<br/>');
          setMessages(prev => [...prev, {
            id: `bot_${Date.now()}`,
            sender: 'received',
            text: formatted,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        })
        .catch(() => {
          setIsTyping(false);
        });
    }, 200);
  };

  const handleCheckoutSubmit = () => {
    setLoadingPayment(true);
    addLog('WEBHOOK', `Checkout API payload sent for ${customerName}. Awaiting gateway validation token...`, 'debug');

    setTimeout(() => {
      setLoadingPayment(false);

      const isCardFailed = paymentMethod === 'card' && (visaOutage || mastercardOutage);
      const isUpiFailed = paymentMethod === 'upi' && upiOutage;

      if (isCardFailed || isUpiFailed) {
        addLog('WEBHOOK', `Payment failed. Reason: Gateway Outage (Status: 503 Service Unavailable)`, 'error');
        alert(`Payment failed: ${isCardFailed ? 'Card Gateway offline' : 'UPI Network timeout'}. Please try another payment method.`);
        return;
      }
      
      setCheckoutStep('success');
      const refId = "pay_rec_" + Math.random().toString(36).substring(2, 10).toUpperCase();
      onPaymentSuccess(chatState.amount);
      
      updateTransactionStatus(
        chatState.currentTxId,
        'Recovered',
        `Payment recovered successfully via WhatsApp checkout by ${customerName}. Ref: ${refId}`,
        chatState.amount
      );

      setTimeout(() => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, {
          id: `bot_success_${Date.now()}`,
          sender: 'received',
          text: `🎉 <strong>Payment Confirmed!</strong> Thank you ${customerName}. Your transaction of ₹${chatState.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been verified. Ref: ${refId}. Your order for <strong>${chatState.productName}</strong> is now confirmed!`,
          timestamp: timeStr
        }]);
        setReplies([]);
      }, 1000);

      addLog('WEBHOOK', `Simulated payment.captured webhook received for ${customerName}. Recovered ₹${chatState.amount.toFixed(2)}`, 'success');
    }, 1500);
  };

  const formatCurrency = (num: number) => {
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <section className="tab-content active" id="tab-playground" style={{ paddingBottom: '24px' }}>
      
      {/* Customer Dues Switcher Banner */}
      {batchData.length > 0 && (
        <div className="customer-switcher-box" style={{ marginBottom: '16px', border: '2px solid var(--border-color)' }}>
          <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <i className="fa-solid fa-user-tag" style={{ color: 'var(--color-primary)', marginRight: '6px' }} />
            Select Customer with Dues:
          </span>
          <select 
            className="customer-select"
            value={chatState.currentTxId}
            onChange={(e) => handleSelectCustomer(e.target.value)}
          >
            {batchData.filter(t => t.status !== 'Recovered').map((tx) => (
              <option key={tx.id} value={tx.id}>
                {tx.customerName} — ₹{tx.amount.toLocaleString('en-IN')} Due ({tx.productName}) [{tx.status}]
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ padding: '4px 8px', backgroundColor: 'var(--color-primary)', color: '#FFF' }}>
              Dues: ₹{formatCurrency(chatState.amount)}
            </span>
          </div>
        </div>
      )}

      <div className="playground-grid">
        
        {/* WhatsApp Chat Sandbox */}
        <div className="card chat-simulator-card swiss-grid-pattern">
          <div className="wa-chat-container">
            <div className="wa-chat-header">
              <div className="wa-avatar">
                <img src="/app-icon.png" alt="RazorRecovery Bot" className="wa-avatar-img" />
              </div>
              <div className="wa-user-info">
                <span className="section-index">01. CONVERSATIONAL SANDBOX</span>
                <strong>RazorRecovery Bot</strong>
                <span>RECOVERING DUES FOR: <strong>{customerName.toUpperCase()}</strong></span>
              </div>
            </div>

            <div className="wa-chat-body" id="playground-messages">
              <div className="wa-bubble system">
                Active recovery session for {customerName} • Due: ₹{formatCurrency(chatState.amount)} • TxID: {chatState.currentTxId}
              </div>
              
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`wa-bubble ${msg.sender === 'sent' ? 'sent' : 'received'}`}
                  >
                    {msg.isVoice ? (
                      <div className="voice-note-bubble">
                        <button 
                          className="play-voice-btn" 
                          onClick={handlePlayVoiceNote}
                        >
                          <i className={`fa-solid ${isAudioPlaying ? 'fa-pause' : 'fa-play'}`} />
                        </button>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>Hinglish Voice Nudge for {customerName}</div>
                          <div style={{ fontSize: '10px', opacity: 0.8 }}>Synthesized audio fallback</div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: msg.text }} 
                      />
                    )}
                    <span className="wa-time">{msg.timestamp}</span>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    key="typing_ind"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="wa-typing-indicator"
                  >
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="wa-chat-footer">
              {/* Quick Reply Suggestions */}
              {replies.length > 0 && !chatState.optedOut && (
                <div className="quick-replies-row" style={{ marginBottom: '10px' }} id="playground-quick-replies">
                  {replies.map((reply) => (
                    <button
                      key={reply.id}
                      className="reply-chip"
                      onClick={() => handleQuickReply(reply.id, reply.label)}
                    >
                      {reply.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Interactive Message Input Box */}
              <form onSubmit={handleSendMessage} className="wa-input-form">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Ask a question or reply as ${customerName} (e.g. Why did it fail? Can I get a discount?)...`}
                  className="wa-text-input"
                  disabled={chatState.optedOut || isTyping}
                />
                <button
                  type="submit"
                  className="wa-send-btn"
                  disabled={!inputText.trim() || isTyping || chatState.optedOut}
                  title="Send message to AI Recovery Agent"
                >
                  <i className="fa-solid fa-paper-plane" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Razorpay Hosted Checkout Simulator */}
        <div className="checkout-simulator-card">
          <div className="card-header" style={{ padding: '0 0 16px 0', borderBottom: '2px solid #000', marginBottom: '24px' }}>
            <div>
              <span className="section-index">02. HOSTED CHECKOUT GATEWAY</span>
              <h2>Razorpay Sandbox checkout</h2>
              <p>Customer: <strong>{customerName}</strong> • Due: <strong>₹{formatCurrency(chatState.amount)}</strong></p>
            </div>
          </div>
          
          <div style={{ height: 'calc(100% - 80px)' }} id="checkout-view-container">
            <AnimatePresence mode="wait">
              {!checkoutVisible ? (
                <motion.div
                  key="inactive"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="checkout-empty-state swiss-diagonal"
                  style={{ height: '100%' }}
                >
                  <i className="fa-solid fa-credit-card" style={{ fontSize: '32px', marginBottom: '12px' }} />
                  <h3>Checkout Inactive</h3>
                  <p style={{ fontSize: '11px', marginTop: '6px' }}>Click any checkout link inside the conversational logs on the left to load the Razorpay payment window.</p>
                </motion.div>
              ) : checkoutStep === 'pay_form' ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rpy-checkout-window"
                >
                  <div className="rpy-checkout-header">
                    <div className="rpy-logo">
                      Razorpay <span>Trusted Gateway</span>
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      SECURE 256-BIT SSL
                    </div>
                  </div>

                  <div className="rpy-order-summary">
                    <div>
                      <div>ORDER: #{chatState.currentTxId}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{chatState.productName} • {customerName}</div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      ₹{formatCurrency(chatState.amount)}
                      {chatState.discountApplied && (
                        <span style={{ fontSize: '10px', color: 'var(--color-primary)', display: 'block', textAlign: 'right' }}>
                          5% DISC APPLIED
                        </span>
                      )}
                    </div>
                  </div>

                  {optimizerInfo && (
                    <div style={{
                      margin: '10px 16px 4px 16px',
                      padding: '8px 12px',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px'
                    }}>
                      <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#16a34a', fontSize: '13px' }} />
                      <div>
                        <strong style={{ color: '#166534' }}>Razorpay Optimizer: </strong>
                        <span style={{ color: '#14532d' }}>{optimizerInfo.recoveryStrategy}</span>
                        <span style={{ marginLeft: '6px', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '1px 5px' }}>
                          {optimizerInfo.estimatedSuccessLift}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="rpy-pay-options">
                    <div 
                      className={`pay-option ${paymentMethod === 'upi' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      <i className="fa-solid fa-mobile-screen-button" />
                      <div>
                        <div>UPI (Google Pay, PhonePe, Paytm, BHIM)</div>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>Recommended for Instant Settlement</div>
                      </div>
                    </div>

                    <div 
                      className={`pay-option ${paymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <i className="fa-solid fa-credit-card" />
                      <div>
                        <div>Credit / Debit Cards</div>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>Visa, Mastercard, RuPay, Amex</div>
                      </div>
                    </div>

                    <div 
                      className={`pay-option ${paymentMethod === 'netbanking' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('netbanking')}
                    >
                      <i className="fa-solid fa-building-columns" />
                      <div>
                        <div>Netbanking</div>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>HDFC, SBI, ICICI, Axis + 50 Banks</div>
                      </div>
                    </div>
                  </div>

                  <div className="rpy-pay-form">
                    {paymentMethod === 'upi' && (
                      <div>
                        {/* UPI Sub-mode selector */}
                        <div className="upi-tab-selector">
                          <button 
                            type="button"
                            className={`upi-tab-btn ${upiSubMode === 'qr' ? 'active' : ''}`}
                            onClick={() => setUpiSubMode('qr')}
                          >
                            <i className="fa-solid fa-qrcode" style={{ marginRight: '6px' }} />
                            QR Code (Scan & Pay)
                          </button>
                          <button 
                            type="button"
                            className={`upi-tab-btn ${upiSubMode === 'vpa' ? 'active' : ''}`}
                            onClick={() => setUpiSubMode('vpa')}
                          >
                            <i className="fa-solid fa-at" style={{ marginRight: '6px' }} />
                            UPI ID / VPA
                          </button>
                        </div>

                        {upiSubMode === 'qr' ? (
                          <div className="upi-qr-card">
                            {/* QR Code Container */}
                            <div 
                              className="upi-qr-wrapper" 
                              onClick={handleSimulateQrScan}
                              title="Click to simulate scanning with Google Pay or PhonePe"
                            >
                              {/* SVG Matrix QR Pattern */}
                              <svg viewBox="0 0 120 120" width="100%" height="100%">
                                <rect width="120" height="120" fill="#FFFFFF" />
                                
                                {/* Top-Left Finder */}
                                <rect x="8" y="8" width="28" height="28" fill="#012652" />
                                <rect x="12" y="12" width="20" height="20" fill="#FFFFFF" />
                                <rect x="16" y="16" width="12" height="12" fill="#012652" />
                                
                                {/* Top-Right Finder */}
                                <rect x="84" y="8" width="28" height="28" fill="#012652" />
                                <rect x="88" y="12" width="20" height="20" fill="#FFFFFF" />
                                <rect x="92" y="16" width="12" height="12" fill="#012652" />
                                
                                {/* Bottom-Left Finder */}
                                <rect x="8" y="84" width="28" height="28" fill="#012652" />
                                <rect x="12" y="88" width="20" height="20" fill="#FFFFFF" />
                                <rect x="16" y="92" width="12" height="12" fill="#012652" />
                                
                                {/* Simulated QR Data Dots & Micro Blocks */}
                                <g fill="#012652">
                                  <rect x="42" y="10" width="4" height="8" />
                                  <rect x="50" y="10" width="8" height="4" />
                                  <rect x="62" y="8" width="6" height="6" />
                                  <rect x="72" y="12" width="4" height="4" />
                                  <rect x="40" y="24" width="6" height="6" />
                                  <rect x="54" y="20" width="4" height="8" />
                                  <rect x="64" y="22" width="10" height="4" />
                                  <rect x="76" y="20" width="4" height="4" />
                                  
                                  {/* Timing Pattern */}
                                  <rect x="40" y="38" width="40" height="4" />
                                  <rect x="38" y="40" width="4" height="40" />
                                  
                                  {/* Center Body Matrix */}
                                  <rect x="10" y="44" width="6" height="6" />
                                  <rect x="22" y="42" width="4" height="8" />
                                  <rect x="30" y="46" width="4" height="4" />
                                  <rect x="14" y="56" width="8" height="4" />
                                  <rect x="26" y="54" width="4" height="6" />
                                  <rect x="8" y="68" width="4" height="8" />
                                  <rect x="20" y="66" width="8" height="4" />
                                  <rect x="30" y="70" width="4" height="6" />

                                  <rect x="86" y="44" width="6" height="4" />
                                  <rect x="98" y="42" width="4" height="6" />
                                  <rect x="106" y="46" width="6" height="4" />
                                  <rect x="88" y="54" width="8" height="4" />
                                  <rect x="102" y="56" width="4" height="6" />
                                  <rect x="84" y="68" width="6" height="6" />
                                  <rect x="94" y="66" width="8" height="4" />
                                  <rect x="106" y="70" width="6" height="4" />
                                  
                                  <rect x="44" y="84" width="6" height="6" />
                                  <rect x="56" y="82" width="4" height="8" />
                                  <rect x="66" y="86" width="8" height="4" />
                                  <rect x="78" y="84" width="4" height="4" />
                                  <rect x="46" y="96" width="8" height="4" />
                                  <rect x="60" y="94" width="4" height="6" />
                                  <rect x="70" y="98" width="6" height="4" />
                                  <rect x="80" y="94" width="4" height="8" />
                                  <rect x="52" y="104" width="6" height="6" />
                                  <rect x="64" y="106" width="8" height="4" />
                                  <rect x="76" y="104" width="4" height="6" />
                                </g>

                                {/* Center Clear Shield for Logo */}
                                <rect x="44" y="44" width="32" height="32" fill="#FFFFFF" rx="4" stroke="#305EFF" strokeWidth="2" />
                              </svg>

                              {/* Center UPI Logo Badge */}
                              <div className="upi-qr-center-badge">
                                <i className="fa-solid fa-bolt-lightning" style={{ marginRight: '3px' }} />
                                UPI
                              </div>
                            </div>

                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Scan with any UPI App (GPay, PhonePe, Paytm, CRED)
                            </div>

                            <div className="upi-apps-row">
                              <span className="upi-app-badge"><i className="fa-brands fa-google-pay" /> GPay</span>
                              <span className="upi-app-badge">PhonePe</span>
                              <span className="upi-app-badge">Paytm</span>
                              <span className="upi-app-badge">BHIM</span>
                            </div>

                            <div className="upi-timer-badge">
                              <i className="fa-regular fa-clock" />
                              <span>QR expires in <strong>{qrTimer}</strong></span>
                            </div>

                            {/* Simulated Scan Trigger Button */}
                            <button
                              type="button"
                              className="btn-simulate-qr"
                              onClick={handleSimulateQrScan}
                              disabled={simulatingQrScan || loadingPayment}
                            >
                              {simulatingQrScan ? (
                                <span><i className="fa-solid fa-spinner fa-spin" /> Verifying Scan on Device...</span>
                              ) : (
                                <span><i className="fa-solid fa-mobile-screen-button" /> Simulate Scan & Pay on Phone</span>
                              )}
                            </button>

                            {/* Simulated Mobile Approval Banner */}
                            {simulatingQrScan && (
                              <div className="simulated-phone-popup">
                                <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '4px' }}>
                                  <i className="fa-solid fa-bell" style={{ marginRight: '6px' }} />
                                  Simulated Mobile Notification
                                </div>
                                <div style={{ fontSize: '11px', color: '#000', lineHeight: 1.4 }}>
                                  <strong>Google Pay / UPI</strong> received collect request for <strong>₹{formatCurrency(chatState.amount)}</strong> from <em>Acme India Corp</em>.
                                  <br/>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>[Demo Mode: Simulating 6-digit Bank UPI MPIN Authorization...]</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Virtual Payment Address (VPA / UPI ID)</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={vpa} 
                              readOnly 
                              style={{ fontFamily: 'var(--font-mono)' }}
                            />
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              A collect notification will be sent to your UPI App.
                            </div>
                            <button 
                              type="button"
                              className="pay-submit-btn" 
                              style={{ marginTop: '12px' }}
                              onClick={handleCheckoutSubmit}
                              disabled={loadingPayment}
                            >
                              {loadingPayment ? (
                                <span><i className="fa-solid fa-spinner fa-spin" /> Sending Collect Request...</span>
                              ) : (
                                <span>Send Collect Request for ₹{formatCurrency(chatState.amount)}</span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethod === 'card' && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Card Details</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value="•••• •••• •••• 4242  (08/28)" 
                          readOnly 
                          style={{ fontFamily: 'var(--font-mono)' }}
                        />
                        <button 
                          className="pay-submit-btn" 
                          style={{ marginTop: '12px' }}
                          onClick={handleCheckoutSubmit}
                          disabled={loadingPayment}
                        >
                          {loadingPayment ? (
                            <span><i className="fa-solid fa-spinner fa-spin" /> Authorizing Payment...</span>
                          ) : (
                            <span>Pay ₹{formatCurrency(chatState.amount)} via Card</span>
                          )}
                        </button>
                      </div>
                    )}

                    {paymentMethod === 'netbanking' && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Selected Bank</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value="HDFC Bank — Corporate Gateway" 
                          readOnly 
                        />
                        <button 
                          className="pay-submit-btn" 
                          style={{ marginTop: '12px' }}
                          onClick={handleCheckoutSubmit}
                          disabled={loadingPayment}
                        >
                          {loadingPayment ? (
                            <span><i className="fa-solid fa-spinner fa-spin" /> Authorizing Netbanking...</span>
                          ) : (
                            <span>Pay ₹{formatCurrency(chatState.amount)} via Netbanking</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* Success Screen */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rpy-checkout-window"
                >
                  <div className="rpy-success-screen">
                    <i className="fa-solid fa-circle-check rpy-success-icon" style={{ fontSize: '48px', color: 'var(--color-primary)', marginBottom: '16px' }} />
                    <h2 style={{ fontSize: '24px' }}>Payment Successful!</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      ₹{formatCurrency(chatState.amount)} collected from {customerName}.
                    </p>
                    
                    <div className="card" style={{ width: '100%', margin: '16px 0', border: '2px solid var(--border-color)', padding: '16px', backgroundColor: '#FFF' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                        <span>Customer</span>
                        <strong>{customerName}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                        <span>Order ID</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{chatState.currentTxId}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                        <span>Payment Method</span>
                        <strong>{paymentMethod.toUpperCase()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span>Status</span>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>CAPTURED (AUTONOMOUS)</span>
                      </div>
                    </div>

                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => setCheckoutVisible(false)}
                    >
                      Close Checkout Window
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </section>
  );
};
export default PlaygroundTab;
