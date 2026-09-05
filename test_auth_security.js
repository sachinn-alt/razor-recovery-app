import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3001';

async function runAuthSecurityTests() {
  console.log('🔒 Running RazorRecovery Auth & Security Test Suite...\n');

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

  // 1. Test Login with Valid Credentials (MFA Enabled)
  let stepUpToken = null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@razorpay-recovery.ai',
        password: 'SecureAdmin@2026!'
      })
    });
    const data = await res.json();
    stepUpToken = data.stepUpToken;
    assert('Valid credentials returns 2FA requirement and step-up token', res.status === 200 && data.requires2FA === true && Boolean(stepUpToken));
  } catch (err) {
    assert('Valid credentials test', false);
  }

  // 2. Test 2FA OTP Verification
  let sessionToken = null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stepUpToken,
        otpCode: '749201'
      })
    });
    const data = await res.json();
    sessionToken = data.token;
    assert('2FA verification with valid OTP returns session token', res.status === 200 && Boolean(sessionToken) && data.user.role === 'Admin');
  } catch (err) {
    assert('2FA verification test', false);
  }

  // 3. Test Session Token Verification via GET /api/auth/me
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    const data = await res.json();
    assert('Session token validated by GET /api/auth/me', res.status === 200 && data.user.email === 'admin@razorpay-recovery.ai');
  } catch (err) {
    assert('Session token validation test', false);
  }

  // 4. Test Tampered / Forged Session Token (Expect 401)
  try {
    const tamperedToken = sessionToken + 'tampered_sig';
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${tamperedToken}`
      }
    });
    const data = await res.json();
    assert('Tampered session token strictly rejected (401 Unauthorized)', res.status === 401 && data.code === 'INVALID_SESSION_TOKEN');
  } catch (err) {
    assert('Tampered session token test', false);
  }

  // 5. Test Invalid Password Attempt (Expect 401)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@acmeindia.com',
        password: 'WrongPassword123!'
      })
    });
    const data = await res.json();
    assert('Invalid password strictly rejected (401)', res.status === 401 && data.code === 'INVALID_CREDENTIALS');
  } catch (err) {
    assert('Invalid password test', false);
  }

  // 6. Test 1-Click Quick Demo Login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/quick-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: 'finance' })
    });
    const data = await res.json();
    assert('Quick demo persona switch returns valid session for Finance Lead', res.status === 200 && data.user.role === 'Finance Lead');
  } catch (err) {
    assert('Quick demo login test', false);
  }

  // 7. Test Password Reset Request
  try {
    const res = await fetch(`${BASE_URL}/api/auth/reset-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@razorpay-recovery.ai' })
    });
    const data = await res.json();
    assert('Password reset request returns DPDP-compliant confirmation', res.status === 200 && data.success === true);
  } catch (err) {
    assert('Password reset request test', false);
  }

  // 8. Test Audit Logs record Auth Events
  try {
    const res = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    const data = await res.json();
    const hasAuthLogs = data.data.some(log => log.action.includes('LOGIN') || log.action.includes('MFA') || log.action.includes('DEMO'));
    assert('Authentication actions recorded in SQLite audit trail', res.status === 200 && hasAuthLogs);
  } catch (err) {
    assert('Audit logs recording test', false);
  }

  console.log(`\n🏁 Auth Security Suite Results: ${passed} passed, ${failed} failed.\n`);
}

runAuthSecurityTests();
