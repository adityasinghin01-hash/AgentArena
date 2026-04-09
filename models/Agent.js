// models/Agent.js
// Agent schema for the AgentArena marketplace.
// Each agent is a deployable AI persona defined by its systemPrompt.
// Agents compete in auditions — reliability and badge tier update automatically.

const mongoose = require('mongoose');

// ── Constants ────────────────────────────────────────────────
const CATEGORIES = [
    'classifier',
    'writer',
    'ranker',
    'analyzer',
    'linter',
    'scanner',
    'explainer',
    'scheduler',
    'researcher',
    'other',
];

const PRICING_TIERS = ['free', 'paid'];

const BADGE_TIERS = ['unverified', 'tested', 'verified', 'elite'];

// ── Schema ───────────────────────────────────────────────────
const agentSchema = new mongoose.Schema(
    {
        // Immutable key used by the seed script for safe upsert —
        // prevents overwriting user-created agents that share a name.
        seedKey: {
            type: String,
            sparse: true,
        },

        name: {
            type: String,
            required: [true, 'Agent name is required'],
            trim: true,
        },

        description: {
            type: String,
            required: [true, 'Agent description is required'],
        },

        category: {
            type: String,
            enum: {
                values: CATEGORIES,
                message: '{VALUE} is not a valid category',
            },
            required: [true, 'Agent category is required'],
        },

        // The system prompt IS the agent — defines its behavior entirely
        systemPrompt: {
            type: String,
            required: [true, 'System prompt is required'],
        },

        inputSchema: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        outputSchema: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        pricing: {
            type: String,
            enum: {
                values: PRICING_TIERS,
                message: '{VALUE} is not a valid pricing tier',
            },
            default: 'free',
        },

        // ── Performance metrics (updated by auditionService) ─────
        reliabilityScore: {
            type: Number,
            default: 0,
            min: [0, 'Reliability score cannot be negative'],
            max: [100, 'Reliability score cannot exceed 100'],
        },

        winRate: {
            type: Number,
            default: 0,
            min: [0, 'Win rate cannot be negative'],
            max: [100, 'Win rate cannot exceed 100'],
        },

        totalAuditions: {
            type: Number,
            default: 0,
        },

        badgeTier: {
            type: String,
            enum: {
                values: BADGE_TIERS,
                message: '{VALUE} is not a valid badge tier',
            },
            default: 'unverified',
        },

        // ── Ownership ────────────────────────────────────────────
        deployedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Deployer reference is required'],
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// ── Indexes ──────────────────────────────────────────────────
// Compound indexes matching actual query patterns in agentController:
// listAgents:        { isActive: true } sorted by { reliabilityScore: -1, createdAt: -1 }
// getAgentsByCategory: { category, isActive: true } sorted by { reliabilityScore: -1, createdAt: -1 }
agentSchema.index({ isActive: 1, reliabilityScore: -1, createdAt: -1 });
agentSchema.index({ category: 1, isActive: 1, reliabilityScore: -1, createdAt: -1 });
agentSchema.index({ deployedBy: 1 });
agentSchema.index({ badgeTier: 1 });

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;
module.exports.CATEGORIES = CATEGORIES;
module.exports.PRICING_TIERS = PRICING_TIERS;
module.exports.BADGE_TIERS = BADGE_TIERS;
