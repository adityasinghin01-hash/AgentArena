// services/auditionService.js
// Core pipeline executor — runs all agents in parallel per slot,
// evaluates outputs, picks winners, updates agent reliability.
// This is the heart of AgentArena.

const Audition = require('../models/Audition');
const Agent = require('../models/Agent');
const { runAgent, evaluateOutput } = require('./claudeService');
const logger = require('../config/logger');

// ── Badge tier calculation ───────────────────────────────────
const calculateBadgeTier = (totalAuditions, reliabilityScore) => {
    if (totalAuditions >= 50 && reliabilityScore >= 85) {
        return 'elite';
    }
    if (totalAuditions >= 10 && reliabilityScore >= 70) {
        return 'verified';
    }
    if (totalAuditions >= 1) {
        return 'tested';
    }
    return 'unverified';
};

// ── Run a single agent safely ────────────────────────────────
// Never throws — returns a result object regardless of success/failure.
const runSingleAgent = async (agent, slot, userInput) => {
    const startTime = Date.now();

    try {
        const output = await runAgent(agent.systemPrompt, userInput);
        const responseTimeMs = Date.now() - startTime;

        return {
            slotName: slot.name,
            agentId: agent._id,
            agentName: agent.name,
            output,
            responseTimeMs,
            failed: false,
        };
    } catch (err) {
        const responseTimeMs = Date.now() - startTime;

        logger.error('Agent failed during audition', {
            agentId: agent._id,
            agentName: agent.name,
            slotName: slot.name,
            error: err.message,
        });

        return {
            slotName: slot.name,
            agentId: agent._id,
            agentName: agent.name,
            output: 'Agent failed to respond',
            responseTimeMs,
            failed: true,
        };
    }
};

// ── Score a single agent's output ────────────────────────────
const scoreAgent = async (result, slot) => {
    // Failed agents get zero scores
    if (result.failed) {
        return {
            accuracy: 0,
            completeness: 0,
            format: 0,
            hallucination: 0,
            total: 0,
        };
    }

    try {
        const scores = await evaluateOutput(
            slot.task,
            result.output,
            slot.evaluationCriteria
        );
        return scores;
    } catch (err) {
        logger.error('Scoring failed for agent', {
            agentId: result.agentId,
            slotName: slot.name,
            error: err.message,
        });
        // Scoring failure → zero scores (don't crash the audition)
        return {
            accuracy: 0,
            completeness: 0,
            format: 0,
            hallucination: 0,
            total: 0,
        };
    }
};

// ── Update agent reliability after audition ──────────────────
const updateAgentReliability = async (agentId, newScore, isWinner) => {
    try {
        const agent = await Agent.findById(agentId);
        if (!agent) {
            return;
        }

        const newTotal = agent.totalAuditions + 1;

        // Rolling average: ((old * count) + new) / (count + 1)
        const newReliability = Math.round(
            ((agent.reliabilityScore * agent.totalAuditions) + newScore) / newTotal
        );

        // Win rate: track wins via current winRate
        const currentWins = Math.round((agent.winRate / 100) * agent.totalAuditions);
        const newWins = isWinner ? currentWins + 1 : currentWins;
        const newWinRate = Math.round((newWins / newTotal) * 100);

        const newBadge = calculateBadgeTier(newTotal, newReliability);

        await Agent.findByIdAndUpdate(agentId, {
            $set: {
                totalAuditions: newTotal,
                reliabilityScore: newReliability,
                winRate: newWinRate,
                badgeTier: newBadge,
            },
        });

        logger.info('Agent reliability updated', {
            agentId,
            totalAuditions: newTotal,
            reliabilityScore: newReliability,
            winRate: newWinRate,
            badgeTier: newBadge,
        });
    } catch (err) {
        logger.error('Failed to update agent reliability', {
            agentId,
            error: err.message,
        });
        // Don't throw — reliability update failure shouldn't crash audition
    }
};

// ═══════════════════════════════════════════════════════════════
// Main executor
// ═══════════════════════════════════════════════════════════════

/**
 * runAudition — executes a full pipeline audition.
 *
 * For each slot: runs all assigned agents in parallel,
 * scores each output, picks winner, streams results via SSE.
 *
 * @param {Object} pipeline - Populated Pipeline document
 * @param {string} userInput - The user's input to send to all agents
 * @param {Function} sseCallback - (data) => writes SSE event to response
 * @returns {Object} Saved Audition document
 */
const runAudition = async (pipeline, userInput, sseCallback) => {
    const allResults = [];

    for (const slot of pipeline.slots) {
        // ── 1. Run all agents in this slot in PARALLEL ───────
        const agentPromises = slot.assignedAgents.map((agent) =>
            runSingleAgent(agent, slot, userInput)
        );

        // Promise.allSettled — one failing agent doesn't kill the rest
        const settled = await Promise.allSettled(agentPromises);
        const agentResults = settled.map((s) =>
            s.status === 'fulfilled'
                ? s.value
                : {
                    slotName: slot.name,
                    agentId: null,
                    agentName: 'Unknown',
                    output: 'Agent failed to respond',
                    responseTimeMs: 0,
                    failed: true,
                }
        );

        // ── 2. Stream agent outputs ──────────────────────────
        for (const result of agentResults) {
            sseCallback({
                event: 'agent_output',
                slot: result.slotName,
                agentId: result.agentId,
                agentName: result.agentName,
                output: result.output,
                responseTimeMs: result.responseTimeMs,
            });
        }

        // ── 3. Score each agent's output ─────────────────────
        const scoredResults = [];
        for (const result of agentResults) {
            const scores = await scoreAgent(result, slot);

            result.scores = scores;
            scoredResults.push(result);

            sseCallback({
                event: 'agent_scores',
                slot: result.slotName,
                agentId: result.agentId,
                scores,
            });
        }

        // ── 4. Pick winner (highest scores.total) ────────────
        let winner = null;
        let highestTotal = -1;

        for (const result of scoredResults) {
            if (result.scores.total > highestTotal) {
                highestTotal = result.scores.total;
                winner = result;
            }
        }

        if (winner) {
            winner.winner = true;
            sseCallback({
                event: 'slot_winner',
                slot: slot.name,
                winnerId: winner.agentId,
                winnerName: winner.agentName,
            });
        }

        // Collect results for DB save
        allResults.push(
            ...scoredResults.map((r) => ({
                slotName: r.slotName,
                agentId: r.agentId,
                agentName: r.agentName,
                output: r.output,
                scores: r.scores,
                responseTimeMs: r.responseTimeMs,
                winner: r.winner || false,
            }))
        );
    }

    // ── 5. Save Audition to DB ───────────────────────────────
    const audition = await Audition.create({
        pipelineId: pipeline._id,
        userId: pipeline.userId,
        userInput,
        results: allResults,
        status: 'complete',
    });

    // ── 6. Update pipeline status ────────────────────────────
    pipeline.status = 'complete';
    await pipeline.save();

    // ── 7. Update agent reliability (fire-and-forget) ────────
    const reliabilityUpdates = allResults
        .filter((r) => r.agentId)
        .map((r) =>
            updateAgentReliability(r.agentId, r.scores.total, r.winner)
        );
    await Promise.allSettled(reliabilityUpdates);

    // ── 8. Stream completion event ───────────────────────────
    sseCallback({
        event: 'complete',
        auditionId: audition._id,
    });

    return audition;
};

module.exports = {
    runAudition,
};
