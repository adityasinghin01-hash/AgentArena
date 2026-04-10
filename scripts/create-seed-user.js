// scripts/create-seed-user.js
// One-time script to create a seed admin user for AgentArena.
// Usage: node scripts/create-seed-user.js
// Idempotent — safe to re-run.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ── Fail-fast ────────────────────────────────────────────────
if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI environment variable is not set.');
    process.exit(1);
}

const SEED_EMAIL = 'seed@agentarena.dev';
const SEED_PASSWORD = 'SeedAdmin@123';
const BCRYPT_ROUNDS = 12;

const run = async () => {
    let failed = false;

    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB.\n');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Check if seed user already exists
        const existing = await usersCollection.findOne({ email: SEED_EMAIL });

        if (existing) {
            console.log('🔄 Seed user already exists — skipping creation.');
            console.log(`\nSEED_USER_ID=${existing._id}`);
        } else {
            // Hash password with bcrypt (12 rounds)
            const hashedPassword = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);

            const result = await usersCollection.insertOne({
                name: 'Seed Admin',
                email: SEED_EMAIL,
                password: hashedPassword,
                role: 'admin',
                isVerified: true,
                isActive: true,
                refreshTokens: [],
                failedLoginAttempts: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            console.log('✅ Seed user created successfully.');
            console.log(`\nSEED_USER_ID=${result.insertedId}`);
        }
    } catch (err) {
        console.error('❌ Failed:', err.message);
        failed = true;
    } finally {
        await mongoose.connection.close();
        console.log('\nDisconnected from database.');
        process.exit(failed ? 1 : 0);
    }
};

run();
