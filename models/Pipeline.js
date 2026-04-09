// models/Pipeline.js
// Pipeline schema for AgentArena.
// A pipeline is a user's decomposed outcome — a plan of AI agent slots
// that will compete in auditions to find the best agent per task.

const mongoose = require('mongoose');

// ── Constants ────────────────────────────────────────────────
const PIPELINE_STATUSES = ['draft', 'ready', 'running', 'complete'];

// ── Sub-schema for slots ─────────────────────────────────────
const slotSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Slot name is required'],
            trim: true,
        },
        task: {
            type: String,
            required: [true, 'Slot task is required'],
        },
        evaluationCriteria: {
            type: String,
            required: [true, 'Evaluation criteria is required'],
        },
        assignedAgents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Agent',
            },
        ],
    },
    { _id: true }
);

// ── Pipeline schema ──────────────────────────────────────────
const pipelineSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
        },

        outcomeText: {
            type: String,
            required: [true, 'Outcome text is required'],
            minlength: [10, 'Outcome text must be at least 10 characters'],
        },

        slots: {
            type: [slotSchema],
            validate: {
                validator: (v) => v.length >= 1,
                message: 'Pipeline must have at least one slot',
            },
        },

        status: {
            type: String,
            enum: {
                values: PIPELINE_STATUSES,
                message: '{VALUE} is not a valid pipeline status',
            },
            default: 'draft',
        },

        deployedApiKey: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ApiKey',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// ── Indexes ──────────────────────────────────────────────────
pipelineSchema.index({ userId: 1, createdAt: -1 });
pipelineSchema.index({ status: 1 });

const Pipeline = mongoose.model('Pipeline', pipelineSchema);

module.exports = Pipeline;
module.exports.PIPELINE_STATUSES = PIPELINE_STATUSES;
