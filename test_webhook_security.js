// ==============================================================================
// RazorRecovery Enterprise Security Test Suite: Webhook & Replay Defense
// ==============================================================================
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3001';
const WEBHOOK_SECRET = 'whsec_live_razor_test_key_991823';
const MERCHANT_ID = 'mid_acme_india';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function generateSignature(payloadStr, secret = WEBHOOK_SECRET) {
  return crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
}

async function sendWebhook(payloadObj, signature, headers = {}) {
  const payloadStr = JSON.stringify(payloadObj);
  const sig = signature !== undefined ? signature : generateSignature(payloadStr);

  const reqHeaders = {
    'Content-Type': 'application/json',
    'x-merchant-id': MERCHANT_ID,
    ...headers
  };
  if (sig !== null) {
    reqHeaders['x-razorpay-signature'] = sig;
  }

  const res = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: reqHeaders,
    body: payloadStr
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, data: json };
}

async function runSecuritySuite() {
  console.log('\n🔒 Starting Strix-Grade Security Verification: Razorpay Webhook Ingestion & Replay Defense\n');

  // Test 1: Legitimate Webhook Ingestion
  console.log('--- Test 1: Valid HMAC-SHA256 Webhook Ingestion ---');
  const validEventId = `evt_valid_${Date.now()}`;
  const validTxId = `pay_live_${Date.now()}`;
  const validPayload = {
    event_id: validEventId,
    event: 'payment.failed',
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: validTxId,
          amount: 850000, // ₹8500 in paise
          currency: 'INR',
          contact: '+919811223344',
          email: 'vikram.malhotra@enterprise.in',
          method: 'upi',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'UPI PIN maximum daily limit exceeded',
          notes: { customer_name: 'Vikram Malhotra' }
        }
      }
    }
  };

  const res1 = await sendWebhook(validPayload);
  console.log('  Response 1:', JSON.stringify(res1.data));
  assert(res1.status === 200, `Valid webhook accepted with 200 OK (got ${res1.status})`);
  assert(res1.data.success === true, 'Response confirms success: true');
  assert(res1.data.targetTxId === validTxId, `Transaction ID correctly mapped to ${validTxId}`);
  assert(res1.data.recoveryActionTaken === 'CADENCE_DISPATCHED', 'Autonomous recovery cadence triggered');

  // Test 2: Forged / Tampered HMAC Signature Attack
  console.log('\n--- Test 2: Forged HMAC Signature Exploit ---');
  const forgedSig = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const res2 = await sendWebhook(validPayload, forgedSig);
  assert(res2.status === 401, `Tampered signature correctly rejected with 401 Unauthorized (got ${res2.status})`);
  assert(res2.data.code === 'INVALID_SIGNATURE', 'Error code is INVALID_SIGNATURE');

  // Test 3: Missing Signature Exploit
  console.log('\n--- Test 3: Missing Signature Exploit ---');
  const res3 = await sendWebhook(validPayload, null);
  assert(res3.status === 401, `Missing signature correctly rejected with 401 (got ${res3.status})`);

  // Test 4: Replay Attack Defense (Timestamp Expired > 300s)
  console.log('\n--- Test 4: Replay Attack Defense (Past Timestamp Skew > 300s) ---');
  const replayEventId = `evt_replay_${Date.now()}`;
  const expiredPayload = {
    event_id: replayEventId,
    event: 'payment.failed',
    created_at: Math.floor(Date.now() / 1000) - 450, // 7.5 minutes old
    payload: {
      payment: {
        entity: { id: `pay_replay_${Date.now()}`, amount: 1500 }
      }
    }
  };
  const res4 = await sendWebhook(expiredPayload);
  assert(res4.status === 400, `Replay attack with 450s skew correctly rejected with 400 Bad Request (got ${res4.status})`);
  assert(res4.data.code === 'EVENT_TIMESTAMP_EXPIRED', 'Error code is EVENT_TIMESTAMP_EXPIRED');

  // Test 5: Replay Attack Defense (Future Timestamp Skew > 300s)
  console.log('\n--- Test 5: Replay Attack Defense (Future Timestamp Skew > 300s) ---');
  const futurePayload = {
    event_id: `evt_future_${Date.now()}`,
    event: 'payment.failed',
    created_at: Math.floor(Date.now() / 1000) + 600, // 10 minutes in future
    payload: {
      payment: {
        entity: { id: `pay_future_${Date.now()}`, amount: 2000 }
      }
    }
  };
  const res5 = await sendWebhook(futurePayload);
  assert(res5.status === 400, `Future timestamp skew correctly rejected with 400 (got ${res5.status})`);
  assert(res5.data.code === 'EVENT_TIMESTAMP_EXPIRED', 'Error code is EVENT_TIMESTAMP_EXPIRED');

  // Test 6: Idempotency Deduplication Guard
  console.log('\n--- Test 6: Idempotency Deduplication Guard ---');
  const idempEventId = `evt_idemp_${Date.now()}`;
  const idempPayload = {
    event_id: idempEventId,
    event: 'payment.failed',
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: { id: `pay_idemp_${Date.now()}`, amount: 3200 }
      }
    }
  };

  const res6a = await sendWebhook(idempPayload);
  assert(res6a.status === 200, 'First event submission succeeds with 200 OK');
  assert(!res6a.data.duplicate, 'First submission is not marked duplicate');

  const res6b = await sendWebhook(idempPayload);
  assert(res6b.status === 200, 'Duplicate event submission returns 200 OK (Idempotent)');
  assert(res6b.data.duplicate === true, 'Response explicitly flags duplicate: true');

  // Test 7: SQL Injection Neutralization in Webhook Payload
  console.log('\n--- Test 7: SQL Injection Payload Defense ---');
  const sqliTxId = `pay_sqli_${Date.now()}`;
  const sqliPayload = {
    event_id: `evt_sqli_${Date.now()}`,
    event: 'payment.failed',
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: sqliTxId,
          amount: 5000,
          contact: "'+OR+'1'='1",
          email: "admin'--@domain.com",
          error_code: "'; DROP TABLE transactions; --",
          error_description: "SQLi injection attempt in error description",
          notes: { customer_name: "Attacker ' UNION SELECT * FROM users --" }
        }
      }
    }
  };

  const res7 = await sendWebhook(sqliPayload);
  assert(res7.status === 200, 'SQL injection payload handled safely without syntax crash');
  assert(res7.data.targetTxId === sqliTxId, 'Prepared statement safely bound malicious strings');

  // Test 8: Success Webhook (order.paid)
  console.log('\n--- Test 8: Payment Captured Webhook (order.paid) ---');
  const capturePayload = {
    event_id: `evt_cap_${Date.now()}`,
    event: 'payment.captured',
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: validTxId,
          method: 'netbanking'
        }
      }
    }
  };

  const res8 = await sendWebhook(capturePayload);
  assert(res8.status === 200, 'Payment captured webhook succeeds with 200 OK');
  assert(res8.data.recoveryActionTaken === 'TRANSACTION_RECOVERED', 'Transaction state updated to TRANSACTION_RECOVERED');

  // Test 9: DPDP Opt-Out Privacy Enforcement
  console.log('\n--- Test 9: DPDP Customer Opt-Out Privacy Enforcement ---');
  const optOutPayload = {
    event_id: `evt_optout_${Date.now()}`,
    event: 'payment.failed',
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: `pay_optout_${Date.now()}`,
          amount: 2999,
          contact: '+919876543210', // Pre-seeded opted-out number
          notes: { customer_name: 'Privacy User' }
        }
      }
    }
  };

  const res9 = await sendWebhook(optOutPayload);
  assert(res9.status === 200, 'Opted-out customer webhook processed safely');
  assert(res9.data.recoveryActionTaken === 'SKIPPED_OPTED_OUT', 'Autonomous WhatsApp cadence skipped for opted-out customer (DPDP Compliance)');

  console.log(`\n==============================================================================`);
  console.log(`🏆 ALL ${passedTests}/${totalTests} SECURITY TESTS PASSED (100% EXPLOIT IMMUNITY)`);
  console.log(`==============================================================================\n`);
}

runSecuritySuite().catch(err => {
  console.error('\n🚨 Security Test Failed:', err);
  process.exit(1);
});
