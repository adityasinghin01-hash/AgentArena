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

        // Promise.allSettled — one failing agent doesn't kill the rest.
        // Note: runSingleAgent never throws (catches internally),
        // so rejections here indicate unexpected infrastructure failures.
        const settled = await Promise.allSettled(agentPromises);
        const agentResults = [];

        for (let i = 0; i < settled.length; i++) {
            const s = settled[i];
            if (s.status === 'fulfilled') {
                agentResults.push(s.value);
            } else {
                // Unexpected rejection — log with full context and skip
                // this entry (don't persist null agentId to DB).
                const agent = slot.assignedAgents[i];
                logger.warn('Unexpected agent rejection in Promise.allSettled', {
                    slotName: slot.name,
                    agentId: agent?._id,
                    agentName: agent?.name,
                    reason: s.reason?.message || String(s.reason),
                });
                // Still stream the failure event so frontend knows
                sseCallback({
                    event: 'agent_output',
                    slot: slot.name,
                    agentId: agent?._id || 'unknown',
                    agentName: agent?.name || 'Unknown',
                    output: 'Agent failed to respond',
                    responseTimeMs: 0,
                });
            }
        }

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
        // Tie-breaking: lower responseTimeMs wins, then alphabetical agentName.
        let winner = null;
        let highestTotal = -1;

        for (const result of scoredResults) {
            const isBetter =
                result.scores.total > highestTotal ||
                (result.scores.total === highestTotal && winner && (
                    result.responseTimeMs < winner.responseTimeMs ||
                    (result.responseTimeMs === winner.responseTimeMs &&
                        result.agentName < winner.agentName)
                ));

            if (isBetter) {
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

        // Collect results for DB save (only entries with valid agentId)
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
