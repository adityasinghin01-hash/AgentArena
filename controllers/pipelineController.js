// controllers/pipelineController.js
// Handles pipeline CRUD — create from decomposed slots, fetch by id, list user's pipelines.

const Pipeline = require('../models/Pipeline');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const { selectAgentsForProblem } = require('../services/agentSelector');

// ═══════════════════════════════════════════════════════════════
// Endpoints
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/pipeline/create
 * Body: { outcomeText, slots: [{ name, task, evaluationCriteria }] }
 * Uses Groq-powered smart selection to pick 3 agents.
 * Same 3 agents are assigned to ALL slots for the arena battle.
 */
const createPipeline = async (req, res, next) => {
    try {
        const { outcomeText, slots } = req.body;

        // ── Smart agent selection: same 3 agents for ALL slots ──
        const agents = await selectAgentsForProblem(outcomeText);
        const agentIds = agents.map((a) => a._id);

        logger.info({
            message: 'Pipeline agents selected',
            agents: agents.map((a) => ({ name: a.name, category: a.category })),
        });

        // Assign the same 3 agents to every slot
        const processedSlots = slots.map((slot) => ({
            name: slot.name,
            task: slot.task,
            evaluationCriteria: slot.evaluationCriteria,
            assignedAgents: agentIds,
        }));

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
