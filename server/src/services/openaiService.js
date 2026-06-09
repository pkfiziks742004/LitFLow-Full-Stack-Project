import OpenAI from 'openai';

import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

let client;

function normalizeWhitespace(value = '') {
  return `${value}`.replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(value = '') {
  return normalizeWhitespace(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function trimSentenceWords(value, maxWords) {
  const words = normalizeWhitespace(value).split(' ').filter(Boolean);

  if (words.length <= maxWords) {
    return normalizeWhitespace(value);
  }

  return `${words.slice(0, maxWords).join(' ').replace(/[,:;]+$/, '')}.`;
}

function toSentence(value) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return '';
  }

  if (/[.!?]$/.test(normalized)) {
    return normalized;
  }

  return `${normalized}.`;
}

function simplifySentence(value) {
  return normalizeWhitespace(value)
    .replace(/\bpropose\b/gi, 'introduce')
    .replace(/\barchitecture\b/gi, 'system')
    .replace(/\bmechanisms\b/gi, 'methods')
    .replace(/\butilize\b/gi, 'use')
    .replace(/\bapproximately\b/gi, 'about')
    .replace(/\bdemonstrate\b/gi, 'show')
    .replace(/\bachieves\b/gi, 'reaches')
    .replace(/\bstate-of-the-art\b/gi, 'very strong')
    .replace(/\bscalable\b/gi, 'practical');
}

function buildFallbackSummary({ title, abstract }) {
  const sentences = splitIntoSentences(abstract);
  const leadSentence = sentences[0]
    ? trimSentenceWords(sentences[0], 24)
    : `${title} explores an important research problem.`;
  const supportingSentence = sentences[1]
    ? trimSentenceWords(sentences[1], 22)
    : 'The paper contributes a practical idea that helps researchers understand the topic faster.';

  const summarySentences = [
    toSentence(leadSentence),
    toSentence(supportingSentence)
  ].filter(Boolean);

  const simplifiedSource = sentences[0]
    ? simplifySentence(trimSentenceWords(sentences[0], 22))
    : `${title} explains a research idea in a practical way.`;
  const simplifiedAbstract = toSentence(
    `In simple terms, ${simplifiedSource.charAt(0).toLowerCase()}${simplifiedSource.slice(1)}`
  );

  return {
    summary: summarySentences.join(' '),
    simplifiedAbstract,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    },
    estimatedCostInr: 0,
    provider: 'fallback'
  };
}

function getClient() {
  if (!env.openAiApiKey) {
    throw new ApiError(503, 'OpenAI is not configured yet.');
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.openAiApiKey
    });
  }

  return client;
}

function extractOutputText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === 'output_text')
    .map((content) => content.text)
    .join('\n')
    .trim();
}

function parseSummaryPayload(text) {
  try {
    const parsed = JSON.parse(text);

    return {
      summary: parsed.summary || '',
      simplifiedAbstract: parsed.simplifiedAbstract || ''
    };
  } catch (_error) {
    return {
      summary: text,
      simplifiedAbstract: ''
    };
  }
}

function estimateCostInr(usage = {}) {
  const inputTokens = Number(usage.input_tokens || usage.inputTokens || 0);
  const outputTokens = Number(usage.output_tokens || usage.outputTokens || 0);

  const inputCostUsd = (inputTokens / 1_000_000) * env.openAiInputCostPer1M;
  const outputCostUsd = (outputTokens / 1_000_000) * env.openAiOutputCostPer1M;
  const usdToInr = 83;

  return Number(((inputCostUsd + outputCostUsd) * usdToInr).toFixed(6));
}

export async function summarizePaper({ title, abstract }) {
  if (!env.openAiApiKey) {
    return buildFallbackSummary({ title, abstract });
  }

  try {
    const response = await getClient().responses.create({
      model: env.openAiModel,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'You are LitFlow AI. Return only valid JSON with keys "summary" and "simplifiedAbstract". Summary must be 2-3 sentences. simplifiedAbstract must rewrite the abstract in plain language for a curious non-expert.'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Title: ${title}\n\nAbstract:\n${abstract}`
            }
          ]
        }
      ]
    });

    const parsed = parseSummaryPayload(extractOutputText(response));
    const usage = response.usage || {};

    return {
      ...parsed,
      usage: {
        inputTokens: Number(usage.input_tokens || usage.inputTokens || 0),
        outputTokens: Number(usage.output_tokens || usage.outputTokens || 0),
        totalTokens: Number(usage.total_tokens || usage.totalTokens || 0)
      },
      estimatedCostInr: estimateCostInr(usage),
      provider: 'openai'
    };
  } catch (error) {
    console.warn('OpenAI summary generation failed, serving fallback summary.', error?.response?.data || error?.message);

    if (abstract) {
      return buildFallbackSummary({ title, abstract });
    }

    throw new ApiError(502, 'OpenAI summary generation failed.', error.response?.data || error.message);
  }
}
