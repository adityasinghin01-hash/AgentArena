// controllers/evaluatorController.js
// Standalone AI output evaluator — scores any output against a rubric.
// Independent of the audition pipeline. Useful for ad-hoc evaluations.

const { evaluateOutput } = require('../services/claudeService');
const logger = require('../config/logger');

/**
 * POST /api/v1/evaluate
 * Body: { task: string, output: string, rubric: string }
 * Returns: { success: true, data: { accuracy, completeness, format, hallucination, total } }
 */
const evaluate = async (req, res, next) => {
    try {
        const { task, output, rubric } = req.body;

        const scores = await evaluateOutput(task, output, rubric);

        return res.status(200).json({
            success: true,
            data: scores,
        });
    } catch (err) {
        logger.error('Standalone evaluation failed', {
            userId: req.user?._id,
            error: err.message,
        });
        return next(err);
    }
};

module.exports = {
    evaluate,
};
