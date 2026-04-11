// services/agentSelector.js
// Smart agent selection for AgentArena battles.
// Uses Groq (Llama 3.3 70B) to pick the 3 best agent categories
// for a given problem, then fetches the top agent per category from DB.
// Fallback: if Groq fails, picks top 3 by reliabilityScore.

const { callAI } = require('./claudeService');
const Agent = require('../models/Agent');
const { CATEGORIES } = require('../models/Agent');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// Use canonical categories from Agent model (includes 'other')
const VALID_CATEGORIES = CATEGORIES;

/**
 * Asks Groq to pick the 3 best agent categories for a problem.
 * Returns an array of 3 category strings.
 * Throws on failure (caller handles fallback).
 */
const pickCategories = async (outcomeText) => {
    const systemPrompt = `You are an agent selector. Given a user's problem, return exactly 3 agent categories that would best solve it. Choose ONLY from: ${VALID_CATEGORIES.join(', ')}. Return ONLY a raw JSON array of 3 strings. No explanation. No markdown. No backticks. Example: ["scanner","linter","explainer"]`;

    const raw = await callAI(systemPrompt, outcomeText, 256, 'groq');

    // Strip any accidental code fences
    const cleaned = raw
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length !== 3) {
        throw new Error(`Expected array of 3, got: ${JSON.stringify(parsed)}`);
    }

    // Validate and deduplicate categories
    const seen = new Set();
    const validated = [];
    for (const cat of parsed) {
        const lower = String(cat).toLowerCase().trim();
        if (!VALID_CATEGORIES.includes(lower)) {
            logger.warn('agentSelector: invalid category from AI, skipping', { category: cat });
            continue;
        }
        if (seen.has(lower)) {
            logger.warn('agentSelector: duplicate category from AI, skipping', { category: lower });
            continue;
        }
        seen.add(lower);
        validated.push(lower);
    }

    if (validated.length === 0) {
        throw new Error('No valid categories returned by AI');
    }

    return validated;
};

/**
 * Fetches the best agent for a given category from DB.
 * Returns the Agent document or null if none found.
 */
const getBestAgentForCategory = async (category) => {
    if (!category) {
        return null;
    }
    return Agent.findOne({ category, isActive: true })
        .sort({ reliabilityScore: -1, createdAt: -1 });
};

/**
 * Fallback: returns top 3 agents by reliabilityScore, ignoring category.
 */
const getFallbackAgents = async () => {
    const agents = await Agent.find({ isActive: true })
        .sort({ reliabilityScore: -1, createdAt: -1 })
        .limit(3);

    if (agents.length < 3) {
        throw new AppError('Not enough agents available (need at least 3 active agents)', 422);
    }

    return agents;
};

/**
 * selectAgentsForProblem — the main export.
 * Uses Groq to intelligently pick 3 diverse agents for the problem.
 *
 * Algorithm:
 * 1. Ask Groq for 3 best categories
 * 2. Pick best agent per category from DB
 * 3. Dedup + backfill if needed
 * 4. Fallback to top 3 by reliability if Groq fails
 *
 * @param {string} outcomeText - The user's stated problem/goal
 * @returns {Promise<Agent[]>} Exactly 3 Agent documents
 */
const selectAgentsForProblem = async (outcomeText) => {
    let categories;

    // ── Step 1: Ask Groq for categories ─────────────────────
    try {
        categories = await pickCategories(outcomeText);
        logger.info('agentSelector: Groq picked categories', { categories });
    } catch (err) {
        logger.warn('agentSelector: Groq selection failed, using fallback', {
            error: err.message,
        });
        const fallback = await getFallbackAgents();
        logger.info('agentSelector: fallback selected', {
            agents: fallback.map((a) => ({ name: a.name, category: a.category })),
        });
        return fallback;
    }

    // ── Step 2: Fetch best agent per category ───────────────
    const selected = [];
    const selectedIds = new Set();

    for (const category of categories) {
        const agent = await getBestAgentForCategory(category);

        if (agent && !selectedIds.has(agent._id.toString())) {
            selected.push(agent);
            selectedIds.add(agent._id.toString());
        }
    }

    // ── Step 3: Backfill if < 3 agents ──────────────────────
    if (selected.length < 3) {
        const remaining = 3 - selected.length;
        const backfill = await Agent.find({
            _id: { $nin: Array.from(selectedIds).map((id) => id) },
            isActive: true,
        })
            .sort({ reliabilityScore: -1, createdAt: -1 })
            .limit(remaining);

        for (const agent of backfill) {
            if (!selectedIds.has(agent._id.toString())) {
                selected.push(agent);
                selectedIds.add(agent._id.toString());
            }
        }
    }

    // ── Step 4: Final validation ────────────────────────────
    if (selected.length < 3) {
        throw new AppError(
            `Not enough agents available (found ${selected.length}, need 3)`,
            422
        );
    }

    logger.info('agentSelector: final selection', {
        agents: selected.map((a) => ({
            name: a.name,
            category: a.category,
            reliability: a.reliabilityScore,
        })),
    });

    return selected.slice(0, 3);
};

module.exports = { selectAgentsForProblem };
