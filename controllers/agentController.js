// controllers/agentController.js
// CRUD operations for AI agents in the AgentArena marketplace.
// Protected routes verify ownership before updates/deletes.

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const logger = require('../config/logger');

// ── POST /api/v1/agents — create agent (protected) ─────────
const createAgent = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array(),
            });
        }

        const {
            name,
            description,
            category,
            systemPrompt,
            inputSchema,
            outputSchema,
            pricing,
        } = req.body;

        const agent = await Agent.create({
            name,
            description,
            category,
            systemPrompt,
            inputSchema,
            outputSchema,
            pricing,
            deployedBy: req.user._id,
        });

        logger.info('Agent created', {
            agentId: agent._id,
            name: agent.name,
            category: agent.category,
            deployedBy: req.user._id,
        });

        return res.status(201).json({
            success: true,
            message: 'Agent created successfully.',
            data: { agent },
        });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/agents — list all active agents (public) ────
const listAgents = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const filter = { isActive: true };

        const [agents, total] = await Promise.all([
            Agent.find(filter)
                .sort({ reliabilityScore: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-systemPrompt')
                .populate('deployedBy', 'name'),
            Agent.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                agents,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/agents/:id — single agent (public) ─────────
const getAgent = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agent ID format.',
            });
        }

        const agent = await Agent.findOne({
            _id: req.params.id,
            isActive: true,
        }).populate('deployedBy', 'name');

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found.',
            });
        }

        return res.status(200).json({
            success: true,
            data: { agent },
        });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/agents/category/:category — filter (public) ─
const getAgentsByCategory = async (req, res, next) => {
    try {
        const { category } = req.params;

        // Category enum check is also done in route-level param validation,
        // but double-check here for safety
        const { CATEGORIES } = require('../models/Agent');
        if (!CATEGORIES.includes(category)) {
            return res.status(400).json({
                success: false,
                message: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}`,
            });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const filter = { category, isActive: true };

        const [agents, total] = await Promise.all([
            Agent.find(filter)
                .sort({ reliabilityScore: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-systemPrompt')
                .populate('deployedBy', 'name'),
            Agent.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                agents,
                total,
                page,
                totalPages: Math.ceil(total / limit),
                category,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ── PUT /api/v1/agents/:id — update own agent (protected) ───
const updateAgent = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array(),
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agent ID format.',
            });
        }

        const agent = await Agent.findById(req.params.id);

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found.',
            });
        }

        // Ownership check — only the deployer can update their own agent
        if (agent.deployedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden — you can only update your own agents.',
            });
        }

        // Whitelist of updatable fields — never allow direct writes to
        // reliabilityScore, winRate, totalAuditions, badgeTier, deployedBy
        const allowedFields = [
            'name',
            'description',
            'category',
            'systemPrompt',
            'inputSchema',
            'outputSchema',
            'pricing',
            'isActive',
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                agent[field] = req.body[field];
            }
        }

        await agent.save();

        logger.info('Agent updated', {
            agentId: agent._id,
            updatedBy: req.user._id,
        });

        return res.status(200).json({
            success: true,
            message: 'Agent updated successfully.',
            data: { agent },
        });
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/v1/agents/:id — delete own agent (protected) ─
const deleteAgent = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agent ID format.',
            });
        }

        const agent = await Agent.findById(req.params.id);

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found.',
            });
        }

        // Ownership check
        if (agent.deployedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden — you can only delete your own agents.',
            });
        }

        // Soft delete — set isActive to false instead of removing from DB
        agent.isActive = false;
        await agent.save();

        logger.info('Agent soft-deleted', {
            agentId: agent._id,
            deletedBy: req.user._id,
        });

        return res.status(200).json({
            success: true,
            message: 'Agent deleted successfully.',
        });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/agents/search — search + filter + sort (public) ──
const searchAgents = async (req, res, next) => {
    try {
        const { q, category, sort } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const filter = { isActive: true };

        // Text search via regex (case-insensitive)
        if (q && q.trim().length > 0) {
            const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } },
            ];
        }

        // Category filter
        if (category && category !== 'all') {
            const { CATEGORIES } = require('../models/Agent');
            if (CATEGORIES.includes(category)) {
                filter.category = category;
            }
        }

        // Sort options
        let sortObj = { reliabilityScore: -1, createdAt: -1 };
        switch (sort) {
            case 'winRate': sortObj = { winRate: -1, createdAt: -1 }; break;
            case 'totalAuditions': sortObj = { totalAuditions: -1, createdAt: -1 }; break;
            case 'newest': sortObj = { createdAt: -1 }; break;
            case 'reliability': sortObj = { reliabilityScore: -1, createdAt: -1 }; break;
        }

        const [agents, total] = await Promise.all([
            Agent.find(filter)
                .sort(sortObj)
                .skip(skip)
                .limit(limit)
                .select('-systemPrompt')
                .populate('deployedBy', 'name'),
            Agent.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                agents,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        next(err);
    }
};

// ── PATCH /api/v1/agents/:id/toggle — flip active/paused (protected) ──
const toggleAgentStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agent ID format.',
            });
        }

        const agent = await Agent.findById(req.params.id);

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found.',
            });
        }

        // Ownership check
        if (agent.deployedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden — you can only toggle your own agents.',
            });
        }

        agent.isActive = !agent.isActive;
        await agent.save();

        logger.info('Agent status toggled', {
            agentId: agent._id,
            isActive: agent.isActive,
            toggledBy: req.user._id,
        });

        return res.status(200).json({
            success: true,
            message: `Agent ${agent.isActive ? 'activated' : 'paused'} successfully.`,
            data: { agent },
        });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/agents/mine — list agents by logged-in user (protected) ──
const getMyAgents = async (req, res, next) => {
    try {
        const agents = await Agent.find({ deployedBy: req.user._id })
            .sort({ createdAt: -1 })
            .populate('deployedBy', 'name');

        return res.status(200).json({
            success: true,
            data: { agents, total: agents.length },
        });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/agents/mine/:id — single agent for owner (protected) ──
const getMyAgent = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agent ID format.',
            });
        }

        const agent = await Agent.findOne({
            _id: req.params.id,
            deployedBy: req.user._id,
        }).populate('deployedBy', 'name');

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found or you do not own it.',
            });
        }

        return res.status(200).json({
            success: true,
            data: { agent },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createAgent,
    listAgents,
    getAgent,
    getAgentsByCategory,
    updateAgent,
    deleteAgent,
    searchAgents,
    toggleAgentStatus,
    getMyAgents,
    getMyAgent,
};

