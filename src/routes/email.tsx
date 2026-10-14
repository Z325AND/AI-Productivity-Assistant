import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Wand2, Bookmark, Eraser, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Field, AiNotice, PrivacyHint, ErrorBox, Thinking, EmptyState, CopyButton, useAi } from "@/components/ww/common";
import { aiText } from "@/lib/ai.functions";
import { takeHandoff, useSaved } from "@/lib/store";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator — WorkWise AI" },
      { name: "description", content: "Generate professional, context-aware workplace emails with adjustable tone and length." },
      { property: "og:title", content: "Smart Email Generator — WorkWise AI" },
      { property: "og:description", content: "Write clear, professional emails tailored to your audience." },
    ],
  }),
  component: EmailPage,
});

const AUDIENCES = ["Client", "Manager", "Colleague", "Team", "Supplier", "Other"];
const TYPES = ["Meeting request", "Follow-up", "Project update", "Apology", "Complaint", "Thank-you", "Proposal", "Application", "Custom"];
const TONES = ["Professional", "Formal", "Informal", "Friendly", "Persuasive", "Diplomatic"];
const LENGTHS = ["Concise", "Standard", "Detailed"];

function Sel({ value, onChange, options, id }: { value: string; onChange: (v: string) => void; options: string[]; id: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function parse(text: string) {
  const m = text.match(/^\s*Subject:\s*(.+)\n+([\s\S]*)$/i);
  return m ? { subject: (m[1] ?? "").trim(), body: (m[2] ?? "").trim() } : { subject: "", body: text.trim() };
}

function EmailPage() {
  const [f, setF] = useState({ purpose: "", audience: "Colleague", type: "Follow-up", tone: "Professional", points: "", name: "", context: "", length: "Standard" });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const ai = useAi(aiText);
  const { save } = useSaved();
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const h = takeHandoff("email");
    if (h) setF((p) => ({ ...p, purpose: h["purpose"] ?? p.purpose, points: h["points"] ?? p.points, type: h["type"] ?? p.type }));
  }, []);

  const generate = async () => {
    if (!f.purpose.trim()) return void setInvalid("Please describe the purpose of the email.");
    setInvalid(null);
    const prompt = `Purpose: ${f.purpose}\nRecipient/audience: ${f.audience}${f.name ? ` (name: ${f.name})` : ""}\nEmail type: ${f.type}\nTone: ${f.tone}\nLength: ${f.length}\nKey points to include:\n${f.points || "(none given)"}\nBackground/subject context: ${f.context || "(none)"}`;
    const r = await ai.run({ kind: "email", prompt });
    if (r) { const p = parse(r); setSubject(p.subject); setBody(p.body); }
  };

  const revise = async (instruction: string) => {
    if (!body) return;
    const r = await ai.run({ kind: "emailRevise", prompt: `Change requested: ${instruction}\n\nSubject: ${subject}\n\n${body}` });
    if (r) { const p = parse(r); setSubject(p.subject || subject); setBody(p.body); }
  };

  const full = `Subject: ${subject}\n\n${body}`;

  return (
    <>
      <PageHeader icon={Mail} title="Smart Email Generator" description="Context-aware, professional emails tailored to your audience and tone." />
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel className="space-y-4 lg:col-span-2">
          <Field label="Purpose or objective *" htmlFor="purpose">
            <Textarea id="purpose" value={f.purpose} onChange={(e) => set("purpose")(e.target.value)} placeholder="e.g. Ask the client to confirm the revised project timeline" rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Audience" htmlFor="aud"><Sel id="aud" value={f.audience} onChange={set("audience")} options={AUDIENCES} /></Field>
            <Field label="Email type" htmlFor="typ"><Sel id="typ" value={f.type} onChange={set("type")} options={TYPES} /></Field>
            <Field label="Tone" htmlFor="tone"><Sel id="tone" value={f.tone} onChange={set("tone")} options={TONES} /></Field>
            <Field label="Length" htmlFor="len"><Sel id="len" value={f.length} onChange={set("length")} options={LENGTHS} /></Field>
          </div>
          <Field label="Key points to include" htmlFor="pts"><Textarea id="pts" value={f.points} onChange={(e) => set("points")(e.target.value)} placeholder="One per line" rows={3} /></Field>
          <Field label="Recipient name (optional)" htmlFor="nm"><Input id="nm" value={f.name} onChange={(e) => set("name")(e.target.value)} /></Field>
          <Field label="Subject or background (optional)" htmlFor="ctx"><Textarea id="ctx" value={f.context} onChange={(e) => set("context")(e.target.value)} rows={2} /></Field>
          {invalid && <p className="text-sm text-destructive">{invalid}</p>}
          <div className="flex gap-2">
            <Button variant="ai" className="flex-1" onClick={generate} disabled={ai.loading}><Wand2 className="h-4 w-4" /> Generate email</Button>
            <Button variant="outline" onClick={() => { setF({ purpose: "", audience: "Colleague", type: "Follow-up", tone: "Professional", points: "", name: "", context: "", length: "Standard" }); setSubject(""); setBody(""); ai.clearError(); }}><Eraser className="h-4 w-4" /> Clear</Button>
          </div>
          <PrivacyHint />
        </Panel>

        <Panel className="lg:col-span-3">
          {ai.error && <div className="mb-4"><ErrorBox error={ai.error} onRetry={() => ai.last && ai.run(ai.last).then((r) => { if (r) { const p = parse(r); setSubject(p.subject || subject); setBody(p.body); } })} /></div>}
          {ai.loading && !body ? <Thinking label="Drafting your email…" /> : !body ? (
            <EmptyState icon={Mail} title="Your email will appear here" text="Fill in the purpose and key points, then click Generate." />
          ) : (
            <div className={`space-y-3 ${ai.loading ? "pointer-events-none opacity-60" : ""}`}>
              <div className="flex items-center justify-between"><AiNotice /><span className="text-xs text-muted-foreground">Editable</span></div>
              <Input aria-label="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="font-medium" />
              <Textarea aria-label="Email body" value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="font-[inherit] leading-relaxed" />
              <div className="flex flex-wrap gap-2">
                <CopyButton text={full} />
                <Button size="sm" variant="outline" onClick={generate}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</Button>
                <Button size="sm" variant="soft" onClick={() => revise("Make it more formal")}>More formal</Button>
                <Button size="sm" variant="soft" onClick={() => revise("Make it friendlier and warmer")}>More friendly</Button>
                <Button size="sm" variant="soft" onClick={() => revise("Make it more persuasive")}>More persuasive</Button>
                <Button size="sm" variant="soft" onClick={() => revise("Shorten it significantly while keeping key points")}>Shorten</Button>
                <Button size="sm" variant="soft" onClick={() => revise("Expand it with more helpful detail, without inventing facts")}>Expand</Button>
                <Button size="sm" variant="outline" onClick={() => { save({ kind: "email", title: subject || "Untitled email", content: full }); toast.success("Email saved"); }}><Bookmark className="h-3.5 w-3.5" /> Save</Button>
              </div>
              {ai.loading && <p className="text-sm text-ai">Revising…</p>}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
