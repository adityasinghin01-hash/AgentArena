// models/Audition.js
// Audition schema for AgentArena — records the results of running
// a pipeline. Same 3 agents compete in every round (slot).
// Scores are cumulative — 1 overall winner is picked at the end.

const mongoose = require('mongoose');

// ── Constants ────────────────────────────────────────────────
const AUDITION_STATUSES = ['running', 'complete', 'failed'];

// ── Score sub-schema ─────────────────────────────────────────
const scoreSchema = new mongoose.Schema(
    {
        accuracy: { type: Number, default: 0, min: 0, max: 100 },
        completeness: { type: Number, default: 0, min: 0, max: 100 },
        format: { type: Number, default: 0, min: 0, max: 100 },
        hallucination: { type: Number, default: 0, min: 0, max: 100 },
        total: { type: Number, default: 0, min: 0, max: 100 },
    },
    { _id: false }
);

// ── Result sub-schema (one per agent per slot) ───────────────
const resultSchema = new mongoose.Schema(
    {
        slotName: {
            type: String,
            required: true,
        },
        agentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Agent',
            required: true,
        },
        agentName: {
            type: String,
            required: true,
        },
        output: {
            type: String,
            default: '',
        },
        scores: {
            type: scoreSchema,
            default: () => ({}),
        },
        responseTimeMs: {
            type: Number,
            default: 0,
        },
    },
    { _id: true }
);

// ── Audition schema ──────────────────────────────────────────
const auditionSchema = new mongoose.Schema(
    {
        pipelineId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Pipeline',
            required: [true, 'Pipeline reference is required'],
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
        },

        userInput: {
            type: String,
            required: [true, 'User input is required'],
        },

        results: {
            type: [resultSchema],
            default: [],
        },

        status: {
            type: String,
            enum: {
                values: AUDITION_STATUSES,
                message: '{VALUE} is not a valid audition status',
            },
            default: 'running',
        },

        // ── Overall winner (set after all rounds complete) ────
        overallWinner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Agent',
            default: null,
        },

        // ── Final leaderboard (cumulative scores across all rounds) ──
        finalLeaderboard: [
            {
                agentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Agent',
                },
                agentName: { type: String },
                totalScore: { type: Number, default: 0 },
                slotScores: [
                    {
                        slot: { type: String },
                        score: { type: Number },
                    },
                ],
            },
        ],
    },
    {
        timestamps: true,
    }
);

// ── Indexes ──────────────────────────────────────────────────
auditionSchema.index({ pipelineId: 1, createdAt: -1 });
auditionSchema.index({ userId: 1, createdAt: -1 });
auditionSchema.index({ status: 1 });

const Audition = mongoose.model('Audition', auditionSchema);

module.exports = Audition;
module.exports.AUDITION_STATUSES = AUDITION_STATUSES;
