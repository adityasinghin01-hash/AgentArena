// scripts/test-claude-service.js
// Quick smoke test for the AI service (claudeService.js).
// Usage: node scripts/test-claude-service.js
// Requires: GROQ_API_KEY (or CLAUDE_API_KEY if AI_PROVIDER=claude) in .env

require('dotenv').config();

const { decomposeOutcome, runAgent } = require('../services/claudeService');

const provider = process.env.AI_PROVIDER || 'groq';

const run = async () => {
    console.log(`\n🤖 AI Provider: ${provider}\n`);
    console.log('═'.repeat(60));

    // ── Test 1: decomposeOutcome ─────────────────────────────
    console.log('\n📋 Test 1: decomposeOutcome("Review my code and find security issues")\n');
    try {
        const result = await decomposeOutcome('Review my code and find security issues');
        console.log('✅ Result:', JSON.stringify(result, null, 2));
        console.log(`   Slots returned: ${result.slots.length}`);
    } catch (err) {
        console.error('❌ Failed:', err.message);
    }

    console.log('\n' + '═'.repeat(60));

    // ── Test 2: runAgent ─────────────────────────────────────
    console.log('\n📋 Test 2: runAgent("You are a helpful assistant", "Say hello in 10 words")\n');
    try {
        const result = await runAgent(
            'You are a helpful assistant. Be concise.',
            'Say hello in exactly 10 words.'
        );
        console.log('✅ Result:', result);
    } catch (err) {
        console.error('❌ Failed:', err.message);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ All tests complete.\n');
    process.exit(0);
};

run();
