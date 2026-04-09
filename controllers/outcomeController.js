// controllers/outcomeController.js
// Handles outcome decomposition — takes user's goal text and
// returns AI-generated agent slots. Does NOT persist to DB.

const { decomposeOutcome } = require('../services/claudeService');
const logger = require('../config/logger');

/**
 * POST /api/v1/outcome/decompose
 * Body: { outcomeText: string }
 * Returns decomposed slots — does NOT save to DB.
 * The frontend uses these to let the user review/edit before creating a pipeline.
 */
const decompose = async (req, res, next) => {
    try {
        const { outcomeText } = req.body;

        const result = await decomposeOutcome(outcomeText);

        return res.status(200).json({
            success: true,
            data: {
                outcomeText,
                slots: result.slots,
            },
        });
    } catch (err) {
        logger.error('Outcome decomposition failed', {
            userId: req.user?._id,
            error: err.message,
        });
        return next(err);
    }
};

module.exports = {
    decompose,
};
