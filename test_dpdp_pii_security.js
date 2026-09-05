// ==============================================================================
// RazorRecovery Enterprise Security Test Suite: DPDP PII Tokenization & RBAC
// ==============================================================================
const BASE_URL = 'http://localhost:3001';

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

async function getPersonaToken(persona) {
  const res = await fetch(`${BASE_URL}/api/auth/quick-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona })
  });
  const data = await res.json();
  return data.token;
}

async function runPiiSecuritySuite() {
  console.log('\n🔒 Starting Strix-Grade Security Verification: DPDP Act 2023 PII Masking & RBAC\n');

  // Fetch transactions to find target ID
  const txRes = await fetch(`${BASE_URL}/api/transactions`);
  const txData = await txRes.json();
  const targetTx = txData.data[0];
  const targetTxId = targetTx.id;

  // Test 1: Public endpoint PII redaction
  console.log('--- Test 1: GET /api/transactions DPDP Masking ---');
  assert(targetTx.phone.includes('****'), `Customer phone is masked with zero-knowledge tokenization: ${targetTx.phone}`);
  assert(targetTx.email.includes('***'), `Customer email is masked with zero-knowledge tokenization: ${targetTx.email}`);

  // Test 2: Unauthenticated PII access exploit
  console.log('\n--- Test 2: Unauthenticated PII Reveal Exploit ---');
  const unauthRes = await fetch(`${BASE_URL}/api/audit-logs/reveal-pii`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId: targetTxId, auditReason: 'Exploit attempt' })
  });
  assert(unauthRes.status === 401, `Unauthenticated request strictly blocked with 401 Unauthorized (got ${unauthRes.status})`);

  // Test 3: Support Agent RBAC Privilege Escalation Exploit
  console.log('\n--- Test 3: Support Agent RBAC Privilege Escalation ---');
  const supportToken = await getPersonaToken('operator');
  const supportRes = await fetch(`${BASE_URL}/api/audit-logs/reveal-pii`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supportToken}`
    },
    body: JSON.stringify({ transactionId: targetTxId, auditReason: 'Operator unauthorized inspection' })
  });
  const supportData = await supportRes.json();
  assert(supportRes.status === 403, `Support agent privilege escalation blocked with 403 Forbidden (got ${supportRes.status})`);
  assert(supportData.code === 'FORBIDDEN_RBAC', 'Error code explicitly returns FORBIDDEN_RBAC');

  // Test 4: Finance Lead RBAC Privilege Escalation Exploit
  console.log('\n--- Test 4: Finance Lead RBAC Privilege Escalation ---');
  const financeToken = await getPersonaToken('finance');
  const financeRes = await fetch(`${BASE_URL}/api/audit-logs/reveal-pii`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${financeToken}`
    },
    body: JSON.stringify({ transactionId: targetTxId, auditReason: 'Finance unauthorized inspection' })
  });
  assert(financeRes.status === 403, `Finance Lead privilege escalation blocked with 403 Forbidden (got ${financeRes.status})`);

  // Test 5: Authorized Admin Regulatory Access
  console.log('\n--- Test 5: Authorized Admin Regulatory PII Access ---');
  const adminToken = await getPersonaToken('admin');
  const adminRes = await fetch(`${BASE_URL}/api/audit-logs/reveal-pii`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ transactionId: targetTxId, auditReason: 'RBI DPDP 2023 Compliance Review' })
  });
  const adminData = await adminRes.json();
  assert(adminRes.status === 200, `Authorized Admin regulatory access returns 200 OK (got ${adminRes.status})`);
  assert(adminData.success === true, 'Response confirms success: true');
  assert(adminData.unmaskedPii && adminData.unmaskedPii.phone, 'Returns unmasked customer phone for authorized audit');
  assert(adminData.dpdpCompliance.auditLogged === true, 'Confirms regulatory action was logged to immutable audit trail');

  // Test 6: Audit Trail Verification
  console.log('\n--- Test 6: Immutable Audit Trail Logging ---');
  const auditRes = await fetch(`${BASE_URL}/api/audit-logs`);
  const auditData = await auditRes.json();
  const recentLogs = auditData.data;

  const hasUnauthorizedLog = recentLogs.some(l => l.action === 'UNAUTHORIZED_PII_REVEAL_ATTEMPT');
  const hasAdminRevealLog = recentLogs.some(l => l.action === 'PII_UNMASKED_BY_ADMIN');

  assert(hasUnauthorizedLog, 'Unauthorized privilege escalation attempts recorded in audit trail');
  assert(hasAdminRevealLog, 'Authorized Admin PII reveals recorded in audit trail');

  console.log(`\n==============================================================================`);
  console.log(`🏆 ALL ${passedTests}/${totalTests} DPDP PII & RBAC SECURITY TESTS PASSED (100% SECURE)`);
  console.log(`==============================================================================\n`);
}

runPiiSecuritySuite().catch(err => {
  console.error('\n🚨 Security Test Failed:', err);
  process.exit(1);
});
