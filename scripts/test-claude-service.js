// scripts/test-claude-service.js
// Quick smoke test for the AI service (claudeService.js).
// Usage: node scripts/test-claude-service.js
// Requires: GROQ_API_KEY (or CLAUDE_API_KEY if AI_PROVIDER=claude) in .env
// Exits with code 1 if any test fails.

require('dotenv').config();

const { decomposeOutcome, runAgent } = require('../services/claudeService');

const provider = process.env.AI_PROVIDER || 'groq';

const run = async () => {
    let passed = 0;
    let failed = 0;

    // eslint-disable-next-line no-console
    console.log(`\n🤖 AI Provider: ${provider}\n`);
    // eslint-disable-next-line no-console
    console.log('═'.repeat(60));

    // ── Test 1: decomposeOutcome ─────────────────────────────
    // eslint-disable-next-line no-console
    console.log('\n📋 Test 1: decomposeOutcome("Review my code and find security issues")\n');
    try {
        const result = await decomposeOutcome('Review my code and find security issues');
        // eslint-disable-next-line no-console
        console.log('✅ Result:', JSON.stringify(result, null, 2));
        // eslint-disable-next-line no-console
        console.log(`   Slots returned: ${result.slots.length}`);
        passed++;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('❌ Failed:', err.message);
        failed++;
    }

    // eslint-disable-next-line no-console
    console.log('\n' + '═'.repeat(60));

    // ── Test 2: runAgent ─────────────────────────────────────
    // eslint-disable-next-line no-console
    console.log('\n📋 Test 2: runAgent("You are a helpful assistant", "Say hello in 10 words")\n');
    try {
        const result = await runAgent(
            'You are a helpful assistant. Be concise.',
            'Say hello in exactly 10 words.'
        );
        // eslint-disable-next-line no-console
        console.log('✅ Result:', result);
        passed++;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('❌ Failed:', err.message);
        failed++;
    }

    // eslint-disable-next-line no-console
    console.log('\n' + '═'.repeat(60));

    // ── Summary ──────────────────────────────────────────────
    if (failed > 0) {
        // eslint-disable-next-line no-console
        console.log(`\n❌ ${failed} test(s) failed, ${passed} passed.\n`);
    } else {
        // eslint-disable-next-line no-console
        console.log(`\n✅ All ${passed} tests passed.\n`);
    }

    process.exit(failed > 0 ? 1 : 0);
};

run();
