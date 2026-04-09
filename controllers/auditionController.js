// controllers/auditionController.js
// Handles audition execution with SSE streaming and audition retrieval.

const Pipeline = require('../models/Pipeline');
const Audition = require('../models/Audition');
const { runAudition } = require('../services/auditionService');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * POST /api/v1/audition/run/:pipelineId
 * Body: { userInput: string }
 * Streams SSE events as agents run, score, and compete.
 */
const run = async (req, res) => {
    const { pipelineId } = req.params;
    const { userInput } = req.body;

    // ── Set SSE headers ──────────────────────────────────────
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Track if client disconnected
    let clientDisconnected = false;
    req.on('close', () => {
        clientDisconnected = true;
        logger.info('SSE client disconnected', { pipelineId });
    });

    // SSE writer — skips writes if client is gone
    const sseCallback = (data) => {
        if (clientDisconnected) {
            return;
        }
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        // ── Fetch and validate pipeline ──────────────────────
        const pipeline = await Pipeline.findById(pipelineId)
            .populate('slots.assignedAgents');

        if (!pipeline) {
            sseCallback({ event: 'error', message: 'Pipeline not found' });
            return res.end();
        }

        if (pipeline.userId.toString() !== req.user._id.toString()) {
            sseCallback({ event: 'error', message: 'Not authorized to run this pipeline' });
            return res.end();
        }

        if (pipeline.slots.length === 0) {
            sseCallback({ event: 'error', message: 'Pipeline has no slots' });
            return res.end();
        }

        // Check all slots have agents
        const emptySlots = pipeline.slots.filter(
            (s) => !s.assignedAgents || s.assignedAgents.length === 0
        );
        if (emptySlots.length > 0) {
            sseCallback({
                event: 'error',
                message: `Slots without agents: ${emptySlots.map((s) => s.name).join(', ')}`,
            });
            return res.end();
        }

        // ── Update pipeline status to running ────────────────
        pipeline.status = 'running';
        await pipeline.save();

        sseCallback({
            event: 'started',
            pipelineId: pipeline._id,
            slotCount: pipeline.slots.length,
            totalAgents: pipeline.slots.reduce(
                (sum, s) => sum + s.assignedAgents.length, 0
            ),
        });

        // ── Execute audition ─────────────────────────────────
        await runAudition(pipeline, userInput, sseCallback);

        return res.end();
    } catch (err) {
        logger.error('Audition execution failed', {
            pipelineId,
            userId: req.user?._id,
            error: err.message,
        });

        sseCallback({ event: 'error', message: 'Audition failed unexpectedly' });

        // Mark pipeline as failed if it was running
        try {
            await Pipeline.findByIdAndUpdate(pipelineId, { status: 'ready' });
        } catch (_updateErr) {
            // Swallow — best-effort status reset
        }

        return res.end();
    }
};

/**
 * GET /api/v1/audition/:id
 * Returns a single audition with populated agent references.
 */
const getAudition = async (req, res, next) => {
    try {
        const audition = await Audition.findById(req.params.id)
            .populate('pipelineId', 'outcomeText status')
            .populate('results.agentId', 'name category badgeTier');

        if (!audition) {
            throw new AppError('Audition not found', 404);
        }

        if (audition.userId.toString() !== req.user._id.toString()) {
            throw new AppError('Not authorized to view this audition', 403);
        }

        return res.status(200).json({
            success: true,
            data: audition,
        });
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/v1/audition/pipeline/:pipelineId
 * Returns paginated auditions for a pipeline (owner-only).
 * Query params: page (default 1), limit (default 20, max 100)
 */
const getAuditionsByPipeline = async (req, res, next) => {
    try {
        const { pipelineId } = req.params;

        // Pagination
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        // Verify pipeline ownership
        const pipeline = await Pipeline.findById(pipelineId).select('userId');
        if (!pipeline) {
            throw new AppError('Pipeline not found', 404);
        }
        if (pipeline.userId.toString() !== req.user._id.toString()) {
            throw new AppError('Not authorized to view these auditions', 403);
        }

        const [auditions, total] = await Promise.all([
            Audition.find({ pipelineId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('results.agentId', 'name category'),
            Audition.countDocuments({ pipelineId }),
        ]);

        return res.status(200).json({
            success: true,
            count: auditions.length,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            data: auditions,
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    run,
    getAudition,
    getAuditionsByPipeline,
};
