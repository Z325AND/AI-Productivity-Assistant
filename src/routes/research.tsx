import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Wand2, Bookmark, RefreshCw, Mail, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Field, AiNotice, PrivacyHint, ErrorBox, Thinking, EmptyState, CopyButton, Markdown, useAi } from "@/components/ww/common";
import { aiText } from "@/lib/ai.functions";
import { setHandoff, useSaved } from "@/lib/store";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant — WorkWise AI" },
      { name: "description", content: "Summarise reports, extract insights and get practical recommendations from your own content." },
      { property: "og:title", content: "AI Research Assistant — WorkWise AI" },
      { property: "og:description", content: "Understand complex topics quickly and make informed decisions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResearchPage,
});

function ResearchPage() {
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [depth, setDepth] = useState("Standard summary");
  const [format, setFormat] = useState("Executive summary");
  const [out, setOut] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const ai = useAi(aiText);
  const { save } = useSaved();
  const navigate = useNavigate();

  const base = () => `Research question/topic: ${topic || "(see supplied text)"}\nDepth: ${depth}\nOutput preference: ${format}\n${url ? `User-referenced URL (NOT fetched — you cannot access it; list it under Sources only as "provided by user, not retrieved"): ${url}\n` : ""}\nSupplied text:\n${text || "(none supplied — answer from general knowledge and clearly label it as such, with no citations)"}`;

  const run = async (extra = "") => {
    if (!topic.trim() && text.trim().length < 30) return void setInvalid("Enter a research question or paste some text to analyse.");
    setInvalid(null);
    const r = await ai.run({ kind: "research", prompt: base() + (extra ? `\n\nAdditional instruction: ${extra}\nPrevious answer:\n${out}` : "") });
    if (r) setOut(r);
  };

  return (
    <>
      <PageHeader icon={Search} title="AI Research Assistant" description="Digest articles and reports, separate evidence from interpretation, and get recommendations." />
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel className="space-y-4 lg:col-span-2">
          <Field label="Research question or topic" htmlFor="q"><Input id="q" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Should we adopt a 4-day work week?" /></Field>
          <Field label="Article or report text" htmlFor="tx"><Textarea id="tx" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the content you want analysed…" /></Field>
          <Field label="Source URL (reference only)" htmlFor="u" hint="Live web access isn't available — paste the article text above for analysis."><Input id="u" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Depth"><Select value={depth} onValueChange={setDepth}><SelectTrigger aria-label="Depth"><SelectValue /></SelectTrigger><SelectContent>{["Quick overview", "Standard summary", "Detailed analysis"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Output style"><Select value={format} onValueChange={setFormat}><SelectTrigger aria-label="Output style"><SelectValue /></SelectTrigger><SelectContent>{["Bullet points", "Executive summary", "Comparison", "Recommendations"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
          </div>
          {invalid && <p className="text-sm text-destructive">{invalid}</p>}
          <Button variant="ai" className="w-full" onClick={() => run()} disabled={ai.loading}><Wand2 className="h-4 w-4" /> Analyse</Button>
          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Works from your supplied content. Sources are only listed when you provide them — none are invented.</div>
          <PrivacyHint />
        </Panel>
        <Panel className="lg:col-span-3">
          {ai.error && <div className="mb-4"><ErrorBox error={ai.error} onRetry={() => run()} /></div>}
          {ai.loading ? <Thinking label="Researching…" /> : !out ? (
            <EmptyState icon={Search} title="Your analysis will appear here" text="Ask a question and/or paste text, then click Analyse." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AiNotice />
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={out} />
                  <Button size="sm" variant="outline" onClick={() => run()}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</Button>
                  <Button size="sm" variant="soft" onClick={() => run("Rewrite in simpler, plain language for a non-expert.")}>Simplify</Button>
                  <Button size="sm" variant="soft" onClick={() => run("Expand with more depth and detail, staying grounded in the supplied content.")}>Expand</Button>
                  <Button size="sm" variant="outline" onClick={() => { save({ kind: "research", title: topic || "Research summary", content: out }); toast.success("Research saved"); }}><Bookmark className="h-3.5 w-3.5" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setHandoff({ to: "email", data: { purpose: `Share research findings on: ${topic || "the attached topic"}`, points: out.slice(0, 3000), type: "Project update" } }); navigate({ to: "/email" }); }}><Mail className="h-3.5 w-3.5" /> Draft email</Button>
                </div>
              </div>
              <Markdown>{out}</Markdown>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
