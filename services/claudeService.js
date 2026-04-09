// services/claudeService.js
// Central AI service for AgentArena — ALL AI API calls go through here.
// Supports multiple providers via AI_PROVIDER config switch.
// Currently: "groq" (free, for local dev) and "claude" (production).
// Never call any AI API directly from a controller — always use this service.

const config = require('../config/config');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// ── Provider configurations ─────────────────────────────────
// Each provider defines its URL, auth headers, request body shape,
// and how to extract the response text. Zero code changes needed
// to switch providers — just change AI_PROVIDER in .env.
const PROVIDERS = {
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        getApiKey: () => config.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
        headers: (key) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        }),
        buildBody: (systemPrompt, userMessage, maxTokens) => ({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            max_tokens: maxTokens,
            temperature: 0.7,
        }),
        extractText: (data) =>
            data?.choices?.[0]?.message?.content || null,
    },
    claude: {
        url: 'https://api.anthropic.com/v1/messages',
        getApiKey: () => config.CLAUDE_API_KEY,
        model: 'claude-opus-4-5',
        headers: (key) => ({
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
        }),
        buildBody: (systemPrompt, userMessage, maxTokens) => ({
            model: 'claude-opus-4-5',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userMessage },
            ],
        }),
        extractText: (data) =>
            data?.content?.[0]?.text || null,
    },
};

// ── Helpers ──────────────────────────────────────────────────

/**
 * Strips markdown code fences from AI responses before JSON parsing.
 * Handles ```json ... ```, ``` ... ```, and stray backtick lines.
 */
const stripCodeBlocks = (text) => {
    if (!text || typeof text !== 'string') {
        return text;
    }
    // Remove ```json ... ``` or ``` ... ``` wrappers
    return text
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
};

/**
 * Safely parse JSON from an AI response. Strips code blocks first.
 * Throws AppError with a caller-friendly message on failure.
 */
const safeParseJSON = (text, context) => {
    const cleaned = stripCodeBlocks(text);
    try {
        return JSON.parse(cleaned);
    } catch (_err) {
        logger.error('AI returned invalid JSON', {
            context,
            rawLength: text?.length,
            preview: text?.substring(0, 200),
        });
        throw new AppError('AI returned invalid JSON', 502);
    }
};

// ── Core function ────────────────────────────────────────────

/**
 * callAI — base function for all AI calls.
 * Reads AI_PROVIDER from config, picks the right provider config,
 * makes the API call with timeout, and returns the extracted text.
 *
 * @param {string} systemPrompt - System-level instructions for the AI
 * @param {string} userMessage  - The user's input/query
 * @param {number} maxTokens    - Max tokens in response (default: 2048)
 * @returns {string} The AI's response text
 */
const callAI = async (systemPrompt, userMessage, maxTokens = 2048) => {
    const providerName = config.AI_PROVIDER;
    const provider = PROVIDERS[providerName];

    if (!provider) {
        throw new AppError(
            `Unknown AI provider: "${providerName}". Supported: ${Object.keys(PROVIDERS).join(', ')}`,
            500
        );
    }

    const apiKey = provider.getApiKey();
    if (!apiKey) {
        throw new AppError(
            `API key not configured for provider "${providerName}". Check your .env file.`,
            500
        );
    }

    // Abort controller for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.AI_TIMEOUT_MS);

    try {
        const response = await fetch(provider.url, {
            method: 'POST',
            headers: provider.headers(apiKey),
            body: JSON.stringify(provider.buildBody(systemPrompt, userMessage, maxTokens)),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.text();
            logger.error('AI API request failed', {
                provider: providerName,
                status: response.status,
                body: errorBody.substring(0, 500),
            });
            throw new AppError(
                `AI service error (${providerName}): request failed with status ${response.status}`,
                502
            );
        }

        const data = await response.json();
        const text = provider.extractText(data);

        if (!text) {
            logger.error('AI returned empty response', { provider: providerName });
            throw new AppError('AI returned an empty response', 502);
        }

        return text;
    } catch (err) {
        clearTimeout(timeoutId);

        // Timeout — AbortController fired
        if (err.name === 'AbortError') {
            logger.error('AI request timed out', {
                provider: providerName,
                timeoutMs: config.AI_TIMEOUT_MS,
            });
            throw new AppError(`AI service timeout (${providerName})`, 504);
        }

        // Re-throw AppErrors as-is (already logged above)
        if (err instanceof AppError) {
            throw err;
        }

        // Unexpected errors — log and wrap
        logger.error('AI call failed unexpectedly', {
            provider: providerName,
            error: err.message,
        });
        throw new AppError(`AI service unavailable (${providerName})`, 502);
    }
};

// ── Public API ───────────────────────────────────────────────

/**
 * decomposeOutcome — breaks a user's goal into 2-4 AI agent slots.
 * Used by the Outcome Engine (Phase 3) to plan pipelines.
 *
 * @param {string} outcomeText - The user's stated goal
 * @returns {{ slots: Array<{ name: string, task: string, evaluation_criteria: string }> }}
 */
const decomposeOutcome = async (outcomeText) => {
    const systemPrompt = `You are a pipeline architect. Break the user's goal into 2-4 specialized AI agent slots.
Return ONLY valid JSON in this exact format, no markdown, no explanation, no code blocks:
{"slots": [{"name": "string", "task": "string", "evaluation_criteria": "string"}]}
Keep slot names short (2-3 words). Keep tasks specific and actionable.
Return 2-4 slots maximum.`;

    const text = await callAI(systemPrompt, outcomeText, 1024);
    const parsed = safeParseJSON(text, 'decomposeOutcome');

    // Validate structure
    if (!parsed.slots || !Array.isArray(parsed.slots)) {
        logger.error('decomposeOutcome: missing slots array', { parsed });
        throw new AppError('AI returned invalid JSON', 502);
    }

    if (parsed.slots.length < 2 || parsed.slots.length > 4) {
        logger.warn('decomposeOutcome: slot count outside 2-4 range, proceeding anyway', {
            count: parsed.slots.length,
        });
        // Don't throw — the AI sometimes returns slightly outside bounds.
        // Downstream logic can handle it.
    }

    return { slots: parsed.slots };
};

/**
 * evaluateOutput — scores an AI agent's output against a rubric.
 * Used by the Audition Service (Phase 4) to rank competing agents.
 *
 * @param {string} task   - The task the agent was given
 * @param {string} output - The agent's output to evaluate
 * @param {string} rubric - Evaluation criteria/rubric
 * @returns {{ accuracy: number, completeness: number, format: number, hallucination: number, total: number }}
 */
const evaluateOutput = async (task, output, rubric) => {
    const systemPrompt = `You are a strict AI output evaluator. Score the given output.
Return ONLY valid JSON, no markdown, no explanation, no code blocks:
{"accuracy": number, "completeness": number, "format": number, "hallucination": number, "total": number}
All scores 0-100.
hallucination: 100 = no hallucination detected, 0 = severe hallucination.
total = (accuracy * 0.35) + (completeness * 0.30) + (format * 0.15) + (hallucination * 0.20)
Be strict and consistent.`;

    const userMessage = `Task: ${task}\n\nOutput to evaluate:\n${output}\n\nRubric: ${rubric}`;

    const text = await callAI(systemPrompt, userMessage, 512);
    const parsed = safeParseJSON(text, 'evaluateOutput');

    // Validate all 5 score fields exist, are numbers, and within 0-100
    const requiredFields = ['accuracy', 'completeness', 'format', 'hallucination', 'total'];
    for (const field of requiredFields) {
        if (typeof parsed[field] !== 'number') {
            logger.error('evaluateOutput: missing or invalid score field', {
                field,
                value: parsed[field],
            });
            throw new AppError('AI returned invalid JSON', 502);
        }
        if (parsed[field] < 0 || parsed[field] > 100) {
            logger.error('evaluateOutput: score out of range (0-100)', {
                field,
                value: parsed[field],
            });
            throw new AppError('AI returned invalid JSON', 502);
        }
    }

    return {
        accuracy: parsed.accuracy,
        completeness: parsed.completeness,
        format: parsed.format,
        hallucination: parsed.hallucination,
        total: parsed.total,
    };
};

/**
 * runAgent — executes an AI agent with its system prompt and user input.
 * Returns raw text — no JSON parsing.
 * Used by the Pipeline Executor (Phase 4) to run each agent.
 *
 * @param {string} systemPrompt - The agent's system prompt (defines its behavior)
 * @param {string} userInput    - The user's input to the agent
 * @returns {string} Raw AI response text
 */
const runAgent = async (systemPrompt, userInput) => {
    return await callAI(systemPrompt, userInput, 2048);
};

module.exports = {
    callAI,
    decomposeOutcome,
    evaluateOutput,
    runAgent,
};
