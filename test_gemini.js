import fs from 'node:fs';
import path from 'node:path';

// Read .env
const envPath = path.resolve('.env');
let geminiKey = '';
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.*)?\s*$/);
    if (match) {
      geminiKey = (match[1] || '').trim();
      if (geminiKey.startsWith('"') && geminiKey.endsWith('"')) geminiKey = geminiKey.slice(1, -1);
    }
  }
}

async function testAvailableModels() {
  console.log('Listing available models for this key...');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    const data = await res.json();
    if (data.models) {
      console.log('Available models:', data.models.map(m => m.name));
    } else {
      console.log('Error listing models:', data);
    }
  } catch (e) {
    console.log('List error:', e.message);
  }

  const candidateModels = ['gemini-3.6-flash', 'gemini-3-flash', 'gemini-2.5-flash-preview-05-20'];
  for (const model of candidateModels) {
    console.log(`\nTesting ${model}...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, reply with ONE word: ONLINE' }] }]
        })
      });
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      if (res.status === 200) {
        console.log('✅ Response:', data.candidates?.[0]?.content?.parts?.[0]?.text);
      } else {
        console.log('❌ Error:', JSON.stringify(data));
      }
    } catch (e) {
      console.log('Exception:', e.message);
    }
  }
}

testAvailableModels();
