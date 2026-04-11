// services/auditionService.js
// Core pipeline executor — runs the SAME 3 agents in every round (slot),
// tracks cumulative scores, and picks 1 OVERALL winner at the end.
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

// ── Update agent reliability after audition (ATOMIC) ─────────
// Uses $inc for counters to prevent lost updates under concurrency.
// Derived fields (reliabilityScore, winRate, badgeTier) are computed
// from the post-increment values.
const updateAgentReliability = async (agentId, newScore, isWinner) => {
    try {
        // Step 1: Atomic increment of counters
        const incFields = {
            totalAuditions: 1,
            cumulativeScore: newScore,
        };
        if (isWinner) {
            incFields.wins = 1;
        }

        const updated = await Agent.findByIdAndUpdate(
            agentId,
            { $inc: incFields },
            { new: true }
        );

        if (!updated) {
            return;
        }

        // Step 2: Compute derived fields from atomic counters
        const reliabilityScore = Math.round(
            updated.cumulativeScore / updated.totalAuditions
        );
        const winRate = Math.round(
            (updated.wins / updated.totalAuditions) * 100
        );
        const badgeTier = calculateBadgeTier(updated.totalAuditions, reliabilityScore);

        // Step 3: Persist derived fields
        await Agent.findByIdAndUpdate(agentId, {
            $set: { reliabilityScore, winRate, badgeTier },
        });

        logger.info('Agent reliability updated', {
            agentId,
            totalAuditions: updated.totalAuditions,
            reliabilityScore,
            winRate,
            badgeTier,
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
// Main executor — NEW FLOW: same 3 agents, cumulative scoring,
// 1 overall winner
// ═══════════════════════════════════════════════════════════════

/**
 * runAudition — executes a full pipeline audition.
 *
 * NEW FLOW:
 * - Same 3 agents compete in EVERY slot (round)
 * - Scores are cumulative across all rounds
 * - 1 overall winner is picked at the end (not per-slot)
 *
 * SSE events emitted:
 * - agent_output:    per agent per round (output + responseTimeMs)
 * - agent_scores:    per agent per round (accuracy, completeness, etc.)
 * - round_complete:  after each round (cumulative leaderboard)
 * - overall_winner:  after all rounds (final leaderboard + winner)
 * - complete:        audition saved to DB
 *
 * @param {Object} pipeline - Populated Pipeline document
 * @param {string} userInput - The user's input to send to all agents
 * @param {Function} sseCallback - (data) => writes SSE event to response
 * @returns {Object} Saved Audition document
 */
const runAudition = async (pipeline, userInput, sseCallback) => {
    const allResults = [];
    const totalRounds = pipeline.slots.length;

    // ── Extract the 3 agents (same for every slot) ───────────
    // All slots have the same assignedAgents, so grab from first slot.
    const agents = pipeline.slots[0]?.assignedAgents || [];

    if (agents.length === 0) {
        sseCallback({ event: 'error', message: 'No agents assigned to pipeline' });
        return null;
    }

    // ── Initialize scoreboard (cumulative across all rounds) ──
    const scoreboard = {};
    agents.forEach((a) => {
        scoreboard[a._id.toString()] = {
            agentName: a.name,
            totalScore: 0,
            slotScores: [],
            totalResponseTimeMs: 0,
        };
    });

    // ── Process each slot as a ROUND ─────────────────────────
    for (let slotIndex = 0; slotIndex < pipeline.slots.length; slotIndex++) {
        const slot = pipeline.slots[slotIndex];

        // ── 1. Run agents SEQUENTIALLY with stagger ────────────
        // Groq free tier has 12K TPM. Running 3 agents in parallel
        // burns through it instantly. Sequential + retry = reliable.
        const agentResults = [];
        for (const agent of agents) {
            const result = await runSingleAgent(agent, slot, userInput);
            agentResults.push(result);
        }

        // ── 2. Stream agent outputs ──────────────────────────
        for (const result of agentResults) {
            sseCallback({
                event: 'agent_output',
                slot: result.slotName,
                slotIndex,
                agentId: result.agentId,
                agentName: result.agentName,
                output: result.output,
                responseTimeMs: result.responseTimeMs,
            });
        }

        // ── 3. Score each agent's output ─────────────────────
        for (const result of agentResults) {
            const scores = await scoreAgent(result, slot);
            result.scores = scores;

            // Update cumulative scoreboard
            const key = result.agentId.toString();
            if (scoreboard[key]) {
                scoreboard[key].totalScore += scores.total;
                scoreboard[key].slotScores.push({
                    slot: slot.name,
                    score: scores.total,
                });
                scoreboard[key].totalResponseTimeMs += result.responseTimeMs;
            }

            sseCallback({
                event: 'agent_scores',
                slot: result.slotName,
                slotIndex,
                agentId: result.agentId,
                scores,
            });
        }

        // ── 4. Emit round_complete with cumulative leaderboard ─
        const leaderboard = Object.entries(scoreboard)
            .map(([agentId, data]) => ({
                agentId,
                agentName: data.agentName,
                cumulativeScore: data.totalScore,
            }))
            .sort((a, b) => b.cumulativeScore - a.cumulativeScore);

        sseCallback({
            event: 'round_complete',
            slotIndex,
            slotName: slot.name,
            roundNumber: slotIndex + 1,
            totalRounds,
            leaderboard,
        });

        // ── Collect results for DB save ──────────────────────
        allResults.push(
            ...agentResults.map((r) => ({
                slotName: r.slotName,
                agentId: r.agentId,
                agentName: r.agentName,
                output: r.output,
                scores: r.scores,
                responseTimeMs: r.responseTimeMs,
            }))
        );
    }

    // ── 5. Pick OVERALL winner ───────────────────────────────
    // Highest totalScore wins. Tiebreak: fastest totalResponseTimeMs.
    // Then alphabetical agentName.
    const finalLeaderboard = Object.entries(scoreboard)
        .map(([agentId, data]) => ({
            agentId,
            agentName: data.agentName,
            totalScore: data.totalScore,
            slotScores: data.slotScores,
            totalResponseTimeMs: data.totalResponseTimeMs,
        }))
        .sort((a, b) => {
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
            if (a.totalResponseTimeMs !== b.totalResponseTimeMs) {
                return a.totalResponseTimeMs - b.totalResponseTimeMs;
            }
            return a.agentName.localeCompare(b.agentName);
        });

    const winner = finalLeaderboard[0];

    sseCallback({
        event: 'overall_winner',
        winnerId: winner.agentId,
        winnerName: winner.agentName,
        finalLeaderboard: finalLeaderboard.map(({ totalResponseTimeMs, ...rest }) => rest),
    });

    // ── 6. Save Audition to DB ───────────────────────────────
    const audition = await Audition.create({
        pipelineId: pipeline._id,
        userId: pipeline.userId,
        userInput,
        results: allResults,
        status: 'complete',
        overallWinner: winner.agentId,
        finalLeaderboard: finalLeaderboard.map(({ totalResponseTimeMs, ...rest }) => rest),
    });

    // ── 7. Update pipeline status ────────────────────────────
    pipeline.status = 'complete';
    await pipeline.save();

    // ── 8. Update agent reliability (fire-and-forget) ────────
    // The overall winner gets a win increment.
    // All agents get their average round score as the reliability update.
    const reliabilityUpdates = finalLeaderboard.map((entry) => {
        const avgScore = pipeline.slots.length > 0
            ? Math.round(entry.totalScore / pipeline.slots.length)
            : 0;
        const isWinner = entry.agentId === winner.agentId;
        return updateAgentReliability(entry.agentId, avgScore, isWinner);
    });
    await Promise.allSettled(reliabilityUpdates);

    // ── 9. Stream completion event ───────────────────────────
    sseCallback({
        event: 'complete',
        auditionId: audition._id,
    });

    return audition;
};

module.exports = {
    runAudition,
};
