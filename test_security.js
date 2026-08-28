import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3001';
const WEBHOOK_SECRET = 'whsec_live_razor_test_key_991823';

async function runTests() {
  console.log('🧪 Starting RazorRecovery.AI Enterprise FinTech Security & Performance Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. Test Compliance Health Endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/compliance/status`);
    const data = await res.json();
    assert('Compliance Endpoint returns active security flags', data.success && data.compliance.hmacWebhookVerification === 'ACTIVE_HMAC_SHA256');
  } catch (e) {
    assert('Compliance Endpoint reachable', false);
  }

  // 2. Test Webhook with Valid HMAC SHA-256 Signature
  try {
    const testEvtId = `evt_sec_${Date.now()}`;
    const payload = JSON.stringify({
      id: testEvtId,
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            amount: 500000,
            currency: 'INR',
            email: 'secure_customer@example.com',
            contact: '+919876543210',
            error_code: 'BAD_REQUEST_AUTHENTICATION_FAILED',
            error_description: '3D Secure authentication failed'
          }
        }
      }
    });

    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');

    const res = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': testEvtId
      },
      body: payload
    });

    const data = await res.json();
    assert('Valid HMAC SHA-256 signature accepted (200 OK)', res.status === 200 && data.received === true);

    // 3. Test Idempotency (Replaying same webhook)
    const replayRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': testEvtId
      },
      body: payload
    });

    const replayData = await replayRes.json();
    assert('Replay attack prevented by Idempotency check', replayRes.status === 200 && replayData.idempotent === true);
  } catch (e) {
    assert('Webhook valid HMAC test', false);
  }

  // 4. Test Webhook with Tampered / Invalid Signature (Expect 401 Unauthorized)
  try {
    const tamperedPayload = JSON.stringify({ event: 'payment.failed', id: 'evt_fake_999' });
    const forgedSignature = '0000000000000000000000000000000000000000000000000000000000000000';

    const res = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': forgedSignature
      },
      body: tamperedPayload
    });

    const data = await res.json();
    assert('Forged HMAC signature strictly rejected (401 Unauthorized)', res.status === 401 && data.code === 'UNAUTHORIZED_WEBHOOK');

    // 4b. Test Webhook with Missing Signature Header (Expect 401 Unauthorized)
    const unsignedRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: tamperedPayload
    });

    const unsignedData = await unsignedRes.json();
    assert('Missing HMAC signature strictly rejected (401 Unauthorized)', unsignedRes.status === 401 && unsignedData.code === 'UNAUTHORIZED_WEBHOOK');
  } catch (e) {
    assert('Tampered HMAC rejection test', false);
  }

  // 5. Test Server-Side Price & Discount Cap Verification
  try {
    const res = await fetch(`${BASE_URL}/api/recovery/generate-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: 'pay_rec_1001',
        requestedDiscountPercent: 90, // Attacker trying 90% discount
        customerName: 'Rahul Sharma'
      })
    });

    const data = await res.json();
    assert('Discount capped at merchant limit (10% max enforced)', data.success && data.discountAppliedPercent <= 10 && data.finalAmount > 0);
  } catch (e) {
    assert('Server-side price verification', false);
  }

  // 6. Test DPDP Opt-Out Stopping Rule
  try {
    const res = await fetch(`${BASE_URL}/api/recovery/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: 'STOP please unsubscribe me',
        transactionContext: { customerPhone: '+919876543210', customerName: 'Rahul Sharma' }
      })
    });

    const data = await res.json();
    assert('Opt-out stopping rule triggered on keyword STOP', data.success && data.optedOut === true);
  } catch (e) {
    assert('DPDP opt-out rule test', false);
  }

  // 7. Test Razorpay Optimizer Smart Recommendation Engine
  try {
    const res = await fetch(`${BASE_URL}/api/optimizer/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        failureCode: 'BAD_REQUEST_AUTHENTICATION_FAILED',
        paymentMethod: 'card',
        amount: 4499
      })
    });

    const data = await res.json();
    assert('Razorpay Optimizer recommends intelligent UPI fallback', data.success && data.recommendation.recommendedRoute.includes('UPI'));
  } catch (e) {
    assert('Optimizer recommendation test', false);
  }

  console.log(`\n🏁 Test Results: ${passed} passed, ${failed} failed.\n`);
}

runTests();
