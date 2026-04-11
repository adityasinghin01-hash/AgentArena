// scripts/test-agent-selector.js
// Manual test script for agentSelector.selectAgentsForProblem()
// Run: node scripts/test-agent-selector.js
//
// Tests 3 scenarios:
// 1. Code review problem → expect scanner/linter/explainer types
// 2. Tweet writing problem → expect writer/scheduler/researcher types
// 3. Fallback on Groq failure → should not crash

require('dotenv').config();

const mongoose = require('mongoose');
const config = require('../config/config');
const { selectAgentsForProblem } = require('../services/agentSelector');
const logger = require('../config/logger');

const divider = () => console.log('\n' + '═'.repeat(60) + '\n');

const runTests = async () => {
    // ── Connect to DB ────────────────────────────────────────
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.MONGO_URI);
    console.log('✅ Connected\n');

    // ── Test 1: Code review ──────────────────────────────────
    divider();
    console.log('TEST 1: "Review my code and find security issues"');
    divider();
    try {
        const agents = await selectAgentsForProblem('Review my code and find security issues');
        console.log('✅ Selected agents:');
        agents.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.name} (${a.category}) — reliability: ${a.reliabilityScore}`);
        });
        console.log(`   Total: ${agents.length} agents`);
    } catch (err) {
        console.error('❌ Test 1 FAILED:', err.message);
    }

    // ── Test 2: Tweet writing ────────────────────────────────
    divider();
    console.log('TEST 2: "Write and schedule 7 tweets for my tech startup"');
    divider();
    try {
        const agents = await selectAgentsForProblem('Write and schedule 7 tweets for my tech startup');
        console.log('✅ Selected agents:');
        agents.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.name} (${a.category}) — reliability: ${a.reliabilityScore}`);
        });
        console.log(`   Total: ${agents.length} agents`);
    } catch (err) {
        console.error('❌ Test 2 FAILED:', err.message);
    }

    // ── Test 3: Fallback test ────────────────────────────────
    divider();
    console.log('TEST 3: Fallback (empty input to trigger parse failure)');
    divider();
    try {
        // Empty string may cause Groq to return non-JSON → triggers fallback
        const agents = await selectAgentsForProblem('');
        console.log('✅ Fallback selected agents:');
        agents.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.name} (${a.category}) — reliability: ${a.reliabilityScore}`);
        });
        console.log(`   Total: ${agents.length} agents (fallback should still return 3)`);
    } catch (err) {
        console.error('❌ Test 3 FAILED:', err.message);
    }

    divider();
    console.log('All tests complete.');
    await mongoose.disconnect();
    process.exit(0);
};

runTests().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
