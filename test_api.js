async function test() {
  console.log('Testing Razorpay Link Generation...');
  try {
    const rzpRes = await fetch('http://localhost:3001/api/recovery/generate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: 'test_order_99',
        amount: 4499,
        customerName: 'Rahul Sharma',
        customerEmail: 'rahul@example.com',
        customerPhone: '+919876543210',
        discountPercent: 5
      })
    });
    const rzpData = await rzpRes.json();
    console.log('Razorpay Result:', JSON.stringify(rzpData, null, 2));
  } catch (err) {
    console.error('Razorpay test error:', err.message);
  }

  console.log('\nTesting Gemini Chat API...');
  try {
    const chatRes = await fetch('http://localhost:3001/api/recovery/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: 'My card was declined. Can you help me pay with UPI?',
        transactionContext: {
          customerName: 'Rahul Sharma',
          amount: 4499,
          failureReason: 'Bank 3D secure verification timeout'
        }
      })
    });
    const chatData = await chatRes.json();
    console.log('Gemini Chat Result:', JSON.stringify(chatData, null, 2));
  } catch (err) {
    console.error('Gemini test error:', err.message);
  }
}

test();
