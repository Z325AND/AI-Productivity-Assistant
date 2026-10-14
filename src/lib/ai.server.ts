import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, type ModelMessage } from "ai";
import type { z } from "zod";

const BASE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function provider(apiKey: string) {
  return createOpenAI({
    baseURL: BASE_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

const providerOptions = {
  openai: {
    store: false,
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    include: ["reasoning.encrypted_content"],
  },
} as const;

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new AiError("AI is not configured yet (missing server key).", 401);
  return k;
}

function mapError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  const err = e as { statusCode?: number; status?: number; message?: string; responseBody?: string };
  const status = err?.statusCode ?? err?.status ?? 500;
  let msg = "The AI service had a problem. Please try again.";
  if (status === 429) msg = "Too many requests right now. Please wait a moment and retry.";
  else if (status === 402) msg = "AI credits are used up for this workspace. Add credits to continue.";
  else if (status === 403) msg = "AI access is blocked for this workspace. Ask an admin to check AI settings.";
  else if (status === 400) msg = "The request couldn't be processed. Try shortening your input.";
  try {
    const parsed = err?.responseBody ? JSON.parse(err.responseBody) : null;
    const m = parsed?.error?.message ?? parsed?.message;
    if (m && status !== 500) msg = String(m);
  } catch {
    /* ignore */
  }
  return new AiError(msg, status);
}

export async function runText(system: string, messages: ModelMessage[]): Promise<string> {
  try {
    const result = streamText({
      model: provider(key()).responses(MODEL),
      instructions: system,
      messages,
      providerOptions,
    } as Parameters<typeof streamText>[0]);
    const text = (await result.text).trim();
    if (!text) throw new AiError("The AI returned an empty response. Please try again.", 502);
    return text;
  } catch (e) {
    throw mapError(e);
  }
}

export async function runObject<T extends z.ZodTypeAny>(
  system: string,
  prompt: string,
  schema: T,
): Promise<z.infer<T>> {
  try {
    const result = streamText({
      model: provider(key()).responses(MODEL),
      instructions: system,
      messages: [{ role: "user", content: prompt }],
      output: Output.object({ schema }),
      providerOptions,
    } as Parameters<typeof streamText>[0]);
    const out = await result.output;
    if (!out) throw new AiError("The AI returned an empty response. Please try again.", 502);
    return out as z.infer<T>;
  } catch (e) {
    throw mapError(e);
  }
}
