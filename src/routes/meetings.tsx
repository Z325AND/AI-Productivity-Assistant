import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Wand2, Upload, Bookmark, Download, RefreshCw, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Panel, Field, AiNotice, PrivacyHint, ErrorBox, Thinking, EmptyState, CopyButton, useAi, downloadText } from "@/components/ww/common";
import { aiMeeting, type MeetingSummary } from "@/lib/ai.functions";
import { useSaved, useTasks, type Priority } from "@/lib/store";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — WorkWise AI" },
      { name: "description", content: "Turn meeting notes into summaries, decisions, action items and next steps." },
      { property: "og:title", content: "Meeting Notes Summarizer — WorkWise AI" },
      { property: "og:description", content: "Structured, actionable meeting summaries from raw notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MeetingsPage,
});

function toMarkdown(title: string, s: MeetingSummary) {
  const list = (h: string, a: string[]) => `## ${h}\n${a.length ? a.map((x) => `- ${x}`).join("\n") : "- None noted"}\n`;
  return [
    `# ${title || "Meeting summary"}\n`,
    `## Executive summary\n${s.executiveSummary}\n`,
    list("Discussion points", s.discussionPoints),
    list("Key decisions", s.decisions),
    `## Action items\n| Task | Owner | Deadline | Priority | Status |\n|---|---|---|---|---|\n${s.actionItems.map((a) => `| ${a.task} | ${a.owner} | ${a.deadline} | ${a.priority} | ${a.status} |`).join("\n")}\n`,
    list("Unresolved questions", s.unresolvedQuestions),
    list("Risks or blockers", s.risks),
    list("Recommended next steps", s.nextSteps),
    `\n_AI-generated — review before use._`,
  ].join("\n");
}

function MeetingsPage() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [attendees, setAttendees] = useState("");
  const [notes, setNotes] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [result, setResult] = useState<MeetingSummary | null>(null);
  const ai = useAi(aiMeeting);
  const { save } = useSaved();
  const { addMany } = useTasks();
  const navigate = useNavigate();

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(txt|md|markdown|csv|vtt|srt)$/i.test(file.name)) return void toast.error("Unsupported file. Use .txt, .md, .csv, .vtt or .srt");
    if (file.size > 1_000_000) return void toast.error("File too large (max 1 MB)");
    setNotes(await file.text());
    toast.success(`Loaded ${file.name}`);
  };

  const run = async () => {
    if (notes.trim().length < 20) return void setInvalid("Please paste at least a few sentences of meeting notes.");
    setInvalid(null);
    const prompt = `Meeting title: ${title || "Not specified"}\nDate: ${date || "Not specified"}\nAttendees: ${attendees || "Not specified"}\n\nNotes:\n${notes}`;
    const r = await ai.run({ prompt });
    if (r) setResult(r);
  };

  const toTasks = () => {
    if (!result?.actionItems.length) return;
    addMany(result.actionItems.map((a) => ({
      title: a.task,
      description: `Owner: ${a.owner}${title ? ` · From: ${title}` : ""}`,
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(a.deadline) ? a.deadline : undefined,
      importance: a.priority as Priority,
      urgency: a.priority as Priority,
      source: "meeting",
    })));
    toast.success(`${result.actionItems.length} tasks added to planner`, { action: { label: "Open", onClick: () => navigate({ to: "/planner" }) } });
  };

  const md = result ? toMarkdown(title, result) : "";
  const Section = ({ h, items }: { h: string; items: string[] }) => (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold">{h}</h3>
      {items.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="text-sm text-muted-foreground">None noted</p>}
    </div>
  );

  return (
    <>
      <PageHeader icon={FileText} title="Meeting Notes Summarizer" description="Turn lengthy notes into clear, structured, actionable summaries." />
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel className="space-y-4 lg:col-span-2">
          <Field label="Meeting title (optional)" htmlFor="t"><Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date (optional)" htmlFor="d"><Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Attendees (optional)" htmlFor="a"><Input id="a" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Comma separated" /></Field>
          </div>
          <Field label="Meeting notes *" htmlFor="n"><Textarea id="n" value={notes} onChange={(e) => setNotes(e.target.value)} rows={12} placeholder="Paste your meeting notes or transcript…" /></Field>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted">
            <Upload className="h-4 w-4" /> Upload text file (.txt, .md, .csv, .vtt, .srt — max 1 MB)
            <input type="file" accept=".txt,.md,.markdown,.csv,.vtt,.srt" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {invalid && <p className="text-sm text-destructive">{invalid}</p>}
          <Button variant="ai" className="w-full" onClick={run} disabled={ai.loading}><Wand2 className="h-4 w-4" /> Summarize meeting</Button>
          <PrivacyHint />
        </Panel>
        <Panel className="lg:col-span-3">
          {ai.error && <div className="mb-4"><ErrorBox error={ai.error} onRetry={run} /></div>}
          {ai.loading ? <Thinking label="Analysing your notes…" /> : !result ? (
            <EmptyState icon={FileText} title="Your summary will appear here" text="Paste notes and click Summarize. Missing owners or deadlines are shown as “Not specified”." />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AiNotice />
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={md} />
                  <Button size="sm" variant="outline" onClick={() => downloadText(`${title || "meeting-summary"}.md`, md)}><Download className="h-3.5 w-3.5" /> Download</Button>
                  <Button size="sm" variant="outline" onClick={run}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</Button>
                  <Button size="sm" variant="outline" onClick={() => { save({ kind: "meeting", title: title || "Meeting summary", content: md }); toast.success("Summary saved"); }}><Bookmark className="h-3.5 w-3.5" /> Save</Button>
                </div>
              </div>
              <div className="rounded-lg bg-ai-soft p-4 text-sm"><p className="mb-1 font-semibold">Executive summary</p>{result.executiveSummary}</div>
              <div className="grid gap-5 md:grid-cols-2">
                <Section h="Main discussion points" items={result.discussionPoints} />
                <Section h="Key decisions" items={result.decisions} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Action items</h3>
                  {result.actionItems.length > 0 && <Button size="sm" variant="soft" onClick={toTasks}><ListTodo className="h-3.5 w-3.5" /> Add to Task Planner</Button>}
                </div>
                {result.actionItems.length ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Responsible</TableHead><TableHead>Deadline</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>{result.actionItems.map((a, i) => (
                        <TableRow key={i}><TableCell>{a.task}</TableCell><TableCell className={a.owner === "Not specified" ? "text-muted-foreground" : ""}>{a.owner}</TableCell><TableCell className={a.deadline === "Not specified" ? "text-muted-foreground" : ""}>{a.deadline}</TableCell><TableCell>{a.priority}</TableCell><TableCell>{a.status}</TableCell></TableRow>
                      ))}</TableBody>
                    </Table>
                  </div>
                ) : <p className="text-sm text-muted-foreground">No action items found.</p>}
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <Section h="Unresolved questions" items={result.unresolvedQuestions} />
                <Section h="Risks or blockers" items={result.risks} />
                <Section h="Recommended next steps" items={result.nextSteps} />
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
