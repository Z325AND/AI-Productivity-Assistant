import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FlaskConical, Wand2, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, Field, PrivacyHint, CopyButton, EmptyState } from "@/components/ww/common";
import { useSaved } from "@/lib/store";

export const Route = createFileRoute("/prompt-lab")({
  head: () => ({ meta: [
    { title: "Prompt Lab — WorkWise AI" },
    { name: "description", content: "Create structured workplace prompts with a role, task, context and constraints." },
    { property: "og:title", content: "Prompt Lab — WorkWise AI" },
    { property: "og:description", content: "Build and save clear prompts for everyday workplace tasks." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PromptLab,
});

function PromptLab() {
  const [role, setRole] = useState("");
  const [task, setTask] = useState("");
  const [context, setContext] = useState("");
  const [constraints, setConstraints] = useState("");
  const [format, setFormat] = useState("");
  const [output, setOutput] = useState("");
  const { save } = useSaved();
  const build = () => setOutput([
    role.trim() && `Role: ${role.trim()}`,
    `Task: ${task.trim()}`,
    context.trim() && `Context: ${context.trim()}`,
    constraints.trim() && `Constraints: ${constraints.trim()}`,
    format.trim() && `Desired output format: ${format.trim()}`,
  ].filter(Boolean).join("\n\n"));
  return <>
    <PageHeader icon={FlaskConical} title="Prompt Lab" description="Create a clear brief for your next AI task." />
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); build(); }}>
        <Field label="Role" htmlFor="prompt-role"><Input id="prompt-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Project coordinator" /></Field>
        <Field label="Task" htmlFor="prompt-task"><Textarea id="prompt-task" required value={task} onChange={(e) => setTask(e.target.value)} placeholder="What should the AI accomplish?" /></Field>
        <Field label="Context" htmlFor="prompt-context"><Textarea id="prompt-context" value={context} onChange={(e) => setContext(e.target.value)} /></Field>
        <Field label="Constraints" htmlFor="prompt-constraints"><Textarea id="prompt-constraints" value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="Tone, length, facts to preserve…" /></Field>
        <Field label="Desired output format" htmlFor="prompt-format"><Input id="prompt-format" value={format} onChange={(e) => setFormat(e.target.value)} placeholder="e.g. A checklist" /></Field>
        <Button type="submit" variant="ai" disabled={!task.trim()}><Wand2 className="h-4 w-4" /> Build prompt</Button>
        <PrivacyHint />
      </form></Panel>
      <Panel>{output ? <div className="space-y-4"><div className="flex flex-wrap gap-2"><CopyButton text={output} /><Button variant="outline" size="sm" onClick={() => { save({ kind: "prompt", title: task.trim().slice(0, 80), content: output }); toast.success("Prompt saved"); }}><Bookmark className="h-4 w-4" /> Save prompt</Button></div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{output}</p></div> : <EmptyState icon={FlaskConical} title="Your prompt" text="No prompt created yet." />}</Panel>
    </div>
  </>;
}
