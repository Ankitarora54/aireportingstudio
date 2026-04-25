import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client as LangSmithClient } from 'langsmith/client';
import { traceable, getCurrentRunTree } from 'langsmith/traceable';
import { getLangchainCallbacks } from 'langsmith/langchain';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendEnvPath = path.join(__dirname, '..', '.env');
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
const defaultPromptPath = path.join(__dirname, '..', 'prompts', 'commentary.txt');

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath, override: true });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return fallback;
}

function sanitizeEnvValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function resolveOpenAiKey() {
  const runtimeKey = sanitizeEnvValue(process.env.OPENAI_API_KEY);
  if (runtimeKey) {
    return { value: runtimeKey, source: 'process.env' };
  }

  if (fs.existsSync(backendEnvPath)) {
    const parsed = dotenv.parse(fs.readFileSync(backendEnvPath));
    const backendKey = sanitizeEnvValue(parsed.OPENAI_API_KEY);
    if (backendKey) {
      return { value: backendKey, source: 'backend/.env' };
    }
  }

  if (fs.existsSync(rootEnvPath)) {
    const parsed = dotenv.parse(fs.readFileSync(rootEnvPath));
    const rootKey = sanitizeEnvValue(parsed.OPENAI_API_KEY);
    if (rootKey) {
      return { value: rootKey, source: '.env' };
    }
  }

  return { value: '', source: 'missing' };
}

function buildCommentaryConfig() {
  const openAiKey = resolveOpenAiKey();
  const langSmithApiKey = sanitizeEnvValue(process.env.LANGSMITH_API_KEY);
  const promptPath = resolvePromptPath(process.env.COMMENTARY_PROMPT_FILE);

  return {
    model: sanitizeEnvValue(process.env.OPENAI_MODEL) || 'gpt-4o-mini',
    temperature: toNumber(process.env.OPENAI_TEMPERATURE, 0.6),
    maxTokens: toNumber(process.env.OPENAI_MAX_TOKENS, 500),
    timeout: toNumber(process.env.OPENAI_TIMEOUT_MS, 30000),
    maxRetries: toNumber(process.env.OPENAI_MAX_RETRIES, 2),
    tracingEnabled: toBoolean(process.env.LANGSMITH_TRACING, false),
    tracingBackground: toBoolean(process.env.LANGCHAIN_CALLBACKS_BACKGROUND, true),
    tracingProject: sanitizeEnvValue(process.env.LANGSMITH_PROJECT) || 'ai-reporting-studio',
    tracingEndpoint: sanitizeEnvValue(process.env.LANGSMITH_ENDPOINT) || 'https://api.smith.langchain.com',
    tracingWorkspaceId: sanitizeEnvValue(process.env.LANGSMITH_WORKSPACE_ID),
    tracingTags: (process.env.LANGSMITH_TAGS || 'commentary,investment-reporting')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    tracingMetadata: {
      service: 'commentary-generation',
      environment: process.env.NODE_ENV || 'development',
    },
    promptPath,
    openAiKey,
    langSmithApiKey,
  };
}

function resolvePromptPath(value) {
  const promptPath = sanitizeEnvValue(value);

  if (!promptPath) {
    return defaultPromptPath;
  }

  if (path.isAbsolute(promptPath)) {
    return promptPath;
  }

  return path.resolve(path.join(__dirname, '..'), promptPath);
}

function readPromptTemplate(promptPath) {
  return fs.readFileSync(promptPath, 'utf8');
}

function templateValue(value) {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function fillPromptTemplate(template, values) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      return match;
    }

    return templateValue(values[key]);
  });
}

async function createModel(config) {
  if (!config.openAiKey.value) {
    return null;
  }

  const { ChatOpenAI } = await import('@langchain/openai');

  return new ChatOpenAI({
    apiKey: config.openAiKey.value,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    timeout: config.timeout,
    maxRetries: config.maxRetries,
  });
}

function createLangSmithClient(config) {
  if (!config.tracingEnabled || !config.langSmithApiKey) {
    return null;
  }

  return new LangSmithClient({
    apiKey: config.langSmithApiKey,
    apiUrl: config.tracingEndpoint,
    workspaceId: config.tracingWorkspaceId || undefined,
  });
}

function formatFallback(payload) {
  const { metrics, riskMetrics, benchmarkData, peerData } = payload;
  return `* Fund delivered an average return of ${metrics.avg_return.toFixed(2)}%.
* Alpha versus benchmark stood at ${benchmarkData.alpha.toFixed(2)}%.
* Relative to peers, the fund delivered ${peerData.relative_vs_peers.toFixed(2)}% excess return.
* Volatility measured ${riskMetrics.volatility.toFixed(2)}% with Sharpe ratio of ${riskMetrics.sharpe_ratio.toFixed(2)}%.`;
}

function buildPrompt(payload, config) {
  const { metrics, riskMetrics, benchmarkData, peerData, fundObjective } = payload;
  const template = readPromptTemplate(config.promptPath);

  return fillPromptTemplate(template, {
    fundObjective,
    metrics,
    riskMetrics,
    benchmarkData,
    peerData,
    payload,
  });
}

function normalizeBulletPoints(rawContent) {
  return rawContent
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith('*') ? line : `* ${line}`))
    .join('\n');
}

function extractTextContent(content) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('\n');
  }

  return '';
}

export function getCommentaryConfig() {
  return buildCommentaryConfig();
}

export function getCommentaryHealth() {
  const config = buildCommentaryConfig();
  return {
    provider: 'openai-via-langchain',
    model: config.model,
    apiKeyPresent: Boolean(config.openAiKey.value),
    apiKeySource: config.openAiKey.source,
    langSmithApiKeyPresent: Boolean(config.langSmithApiKey),
    backendEnvExists: fs.existsSync(backendEnvPath),
    rootEnvExists: fs.existsSync(rootEnvPath),
    promptPath: config.promptPath,
    promptFileExists: fs.existsSync(config.promptPath),
    tracingEnabled: config.tracingEnabled,
    tracingBackground: config.tracingBackground,
    tracingProject: config.tracingProject,
    tracingEndpoint: config.tracingEndpoint,
    tracingWorkspaceIdPresent: Boolean(config.tracingWorkspaceId),
  };
}

export function getCommentaryPrompt() {
  const config = buildCommentaryConfig();

  return {
    prompt: readPromptTemplate(config.promptPath),
    promptPath: config.promptPath,
  };
}

export function saveCommentaryPrompt(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim()) {
    const error = new Error('Prompt cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  const config = buildCommentaryConfig();
  fs.mkdirSync(path.dirname(config.promptPath), { recursive: true });
  fs.writeFileSync(config.promptPath, prompt.trimEnd() + '\n', 'utf8');

  return {
    prompt,
    promptPath: config.promptPath,
  };
}

export async function generateCommentary(payload) {
  const config = buildCommentaryConfig();
  const fallback = formatFallback(payload);
  const model = await createModel(config);
  const langSmithClient = createLangSmithClient(config);

  if (!model) {
    return {
      commentary: fallback,
      source: 'fallback',
      reason: `OPENAI_API_KEY is missing. Resolved source: ${config.openAiKey.source}.`,
    };
  }

  try {
    const tracedCommentaryInvocation = traceable(
      async (commentaryPayload) => {
        const callbacks = await getLangchainCallbacks(getCurrentRunTree());

        return model.invoke(
          [
            ['human', buildPrompt(commentaryPayload, config)],
          ],
          {
            tags: config.tracingTags,
            metadata: {
              ...config.tracingMetadata,
              fundObjectivePresent: Boolean(commentaryPayload.fundObjective),
              tracingEnabled: config.tracingEnabled,
              openAiKeySource: config.openAiKey.source,
            },
            runName: 'generate-commentary-llm',
            callbacks: callbacks || undefined,
          }
        );
      },
      {
        name: 'generate-commentary',
        run_type: 'chain',
        client: langSmithClient || undefined,
        project_name: config.tracingProject,
        tracingEnabled: config.tracingEnabled,
        tags: config.tracingTags,
        metadata: {
          ...config.tracingMetadata,
          openAiKeySource: config.openAiKey.source,
        },
      }
    );

    const response = await tracedCommentaryInvocation(payload);

    const rawContent = extractTextContent(response.content);
    if (!rawContent.trim()) {
      return {
        commentary: fallback,
        source: 'fallback',
        reason: 'OpenAI returned empty content.',
      };
    }

    if (langSmithClient && !config.tracingBackground) {
      await langSmithClient.awaitPendingTraceBatches();
    }

    return {
      commentary: normalizeBulletPoints(rawContent),
      source: 'openai',
      reason: null,
    };
  } catch (error) {
    const message = typeof error?.message === 'string' && error.message.trim()
      ? error.message
      : 'Unknown OpenAI error.';

    console.error('COMMENTARY GENERATION ERROR:', error);

    if (langSmithClient && !config.tracingBackground) {
      await langSmithClient.awaitPendingTraceBatches();
    }

    return {
      commentary: fallback,
      source: 'fallback',
      reason: message,
    };
  }
}
