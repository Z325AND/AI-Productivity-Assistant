import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PROMPTS } from "./prompts";

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function safe<T>(fn: () => Promise<T>): Promise<AiResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const err = e as { message?: string; status?: number };
    return { ok: false, error: err.message ?? "Something went wrong.", status: err.status ?? 500 };
  }
}

const textInput = z.object({
  kind: z.enum(["email", "emailRevise", "research", "promptBuild", "promptImprove", "promptRun"]),
  prompt: z.string().min(1).max(40000),
});

export const aiText = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => textInput.parse(d))
  .handler(async ({ data }) => {
    const { runText } = await import("./ai.server");
    return safe(() => runText(PROMPTS[data.kind], [{ role: "user", content: data.prompt }]));
  });

const chatInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20000) }))
    .min(1)
    .max(60),
});

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => chatInput.parse(d))
  .handler(async ({ data }) => {
    const { runText } = await import("./ai.server");
    return safe(() => runText(PROMPTS.chat, data.messages));
  });

export const meetingSchema = z.object({
  executiveSummary: z.string(),
  discussionPoints: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(
    z.object({
      task: z.string(),
      owner: z.string(),
      deadline: z.string(),
      priority: z.enum(["High", "Medium", "Low"]),
      status: z.string(),
    }),
  ),
  unresolvedQuestions: z.array(z.string()),
  risks: z.array(z.string()),
  nextSteps: z.array(z.string()),
});
export type MeetingSummary = z.infer<typeof meetingSchema>;

export const aiMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ prompt: z.string().min(20).max(40000) }).parse(d))
  .handler(async ({ data }) => {
    const { runObject } = await import("./ai.server");
    return safe(() => runObject(PROMPTS.meeting, data.prompt, meetingSchema));
  });

export const planSchema = z.object({
  summary: z.string(),
  priorityOrder: z.array(
    z.object({
      task: z.string(),
      quadrant: z.enum(["Do first", "Schedule", "Delegate", "Eliminate"]),
      reason: z.string(),
    }),
  ),
  days: z.array(
    z.object({
      day: z.string(),
      blocks: z.array(
        z.object({
          start: z.string(),
          end: z.string(),
          title: z.string(),
          type: z.enum(["task", "break", "meeting"]),
        }),
      ),
    }),
  ),
  conflicts: z.array(z.string()),
  tips: z.array(z.string()),
});
export type Plan = z.infer<typeof planSchema>;

export const aiPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ prompt: z.string().min(5).max(20000) }).parse(d))
  .handler(async ({ data }) => {
    const { runObject } = await import("./ai.server");
    return safe(() => runObject(PROMPTS.planner, data.prompt, planSchema));
  });
