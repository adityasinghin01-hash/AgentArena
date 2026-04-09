// controllers/pipelineController.js
// Handles pipeline CRUD — create from decomposed slots, fetch by id, list user's pipelines.

const Pipeline = require('../models/Pipeline');
const Agent = require('../models/Agent');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// ── Keyword → category mapping ──────────────────────────────
// Used to auto-assign agents when the user doesn't manually pick them.
// Maps common slot name keywords to Agent categories.
const KEYWORD_CATEGORY_MAP = {
    review: 'analyzer',
    analyze: 'analyzer',
    analysis: 'analyzer',
    classify: 'classifier',
    categorize: 'classifier',
    sort: 'classifier',
    triage: 'classifier',
    write: 'writer',
    draft: 'writer',
    summarize: 'writer',
    compose: 'writer',
    rank: 'ranker',
    prioritize: 'ranker',
    score: 'ranker',
    lint: 'linter',
    style: 'linter',
    format: 'linter',
    scan: 'scanner',
    security: 'scanner',
    vulnerability: 'scanner',
    explain: 'explainer',
    document: 'explainer',
    clarify: 'explainer',
    schedule: 'scheduler',
    plan: 'scheduler',
    calendar: 'scheduler',
    research: 'researcher',
    investigate: 'researcher',
    find: 'researcher',
    search: 'researcher',
};

/**
 * Infers the best Agent category from a slot name using keyword matching.
 * Falls back to 'analyzer' if no keyword matches.
 */
const inferCategory = (slotName) => {
    const lower = slotName.toLowerCase();
    for (const [keyword, category] of Object.entries(KEYWORD_CATEGORY_MAP)) {
        if (lower.includes(keyword)) {
            return category;
        }
    }
    return 'analyzer'; // safe fallback
};

/**
 * Fetches top agents for a given category, sorted by reliabilityScore desc.
 * Returns up to `limit` active agents.
 */
const getTopAgentsByCategory = async (category, limit = 3) => {
    const agents = await Agent.find({ category, isActive: true })
        .sort({ reliabilityScore: -1, createdAt: -1 })
        .limit(limit)
        .select('_id');
    return agents.map((a) => a._id);
};

// ═══════════════════════════════════════════════════════════════
// Endpoints
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/pipeline/create
 * Body: { outcomeText, slots: [{ name, task, evaluationCriteria, assignedAgents? }] }
 * If assignedAgents omitted for a slot → auto-assigns top 3 by inferred category.
 */
const createPipeline = async (req, res, next) => {
    try {
        const { outcomeText, slots } = req.body;

        // Auto-assign agents to slots that don't have any
        const processedSlots = await Promise.all(
            slots.map(async (slot) => {
                let assignedAgents = slot.assignedAgents || [];

                if (assignedAgents.length === 0) {
                    const category = inferCategory(slot.name);
                    assignedAgents = await getTopAgentsByCategory(category);

                    if (assignedAgents.length === 0) {
                        // Fallback: grab any 3 active agents
                        const fallback = await Agent.find({ isActive: true })
                            .sort({ reliabilityScore: -1 })
                            .limit(3)
                            .select('_id');
                        assignedAgents = fallback.map((a) => a._id);
                    }

                    logger.info('Auto-assigned agents to slot', {
                        slotName: slot.name,
                        category: inferCategory(slot.name),
                        agentCount: assignedAgents.length,
                    });
                }

                return {
                    name: slot.name,
                    task: slot.task,
                    evaluationCriteria: slot.evaluationCriteria,
                    assignedAgents,
                };
            })
        );

        const pipeline = await Pipeline.create({
            userId: req.user._id,
            outcomeText,
            slots: processedSlots,
            status: 'ready',
        });

        // Populate agents for the response
        await pipeline.populate('slots.assignedAgents', 'name category reliabilityScore');

        return res.status(201).json({
            success: true,
            data: {
                pipelineId: pipeline._id,
                pipeline,
            },
        });
    } catch (err) {
        logger.error('Pipeline creation failed', {
            userId: req.user?._id,
            error: err.message,
        });
        return next(err);
    }
};

/**
 * GET /api/v1/pipeline/:id
 * Returns pipeline with populated agents. Owner-only.
 */
const getPipeline = async (req, res, next) => {
    try {
        const pipeline = await Pipeline.findById(req.params.id)
            .populate('slots.assignedAgents', 'name category reliabilityScore badgeTier');

        if (!pipeline) {
            throw new AppError('Pipeline not found', 404);
        }

        // Owner-only access
        if (pipeline.userId.toString() !== req.user._id.toString()) {
            throw new AppError('Not authorized to view this pipeline', 403);
        }

        return res.status(200).json({
            success: true,
            data: pipeline,
        });
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/v1/pipeline/user/mine
 * Returns all pipelines for the authenticated user, newest first.
 */
const getMyPipelines = async (req, res, next) => {
    try {
        const pipelines = await Pipeline.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('slots.assignedAgents', 'name category reliabilityScore');

        return res.status(200).json({
            success: true,
            count: pipelines.length,
            data: pipelines,
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    createPipeline,
    getPipeline,
    getMyPipelines,
};
