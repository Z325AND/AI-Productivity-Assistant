import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessagesSquare, Plus, Send, Trash2, Copy, Bot, Mail, FileText, CalendarCheck, Search, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AiNotice, ErrorBox, Markdown, copyText, useAi } from "@/components/ww/common";
import { aiChat } from "@/lib/ai.functions";
import { takeHandoff, uid, useChats, type ChatSession } from "@/lib/store";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Workplace Chat — WorkWise AI" },
      { name: "description", content: "Chat with a helpful AI workplace colleague for writing, planning and problem-solving." },
      { property: "og:title", content: "AI Workplace Chat — WorkWise AI" },
      { property: "og:description", content: "Your always-available AI colleague." },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Help me write a professional email.",
  "Summarize these meeting notes.",
  "Create a plan for my workday.",
  "Explain this report in simple terms.",
  "Help me prioritize my workload.",
  "Improve this prompt to get better AI results.",
];

const TOOL_LINKS = [
  { re: /email generator|email/i, to: "/email", label: "Open Email Generator", icon: Mail },
  { re: /meeting (notes )?summari[sz]er/i, to: "/meetings", label: "Open Meeting Summarizer", icon: FileText },
  { re: /task planner|planner/i, to: "/planner", label: "Open Task Planner", icon: CalendarCheck },
  { re: /research assistant/i, to: "/research", label: "Open Research Assistant", icon: Search },
  { re: /prompt lab/i, to: "/prompt-lab", label: "Open Prompt Lab", icon: FlaskConical },
];

function ChatPage() {
  const { chats, setChats } = useChats();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const ai = useAi(aiChat);
  const endRef = useRef<HTMLDivElement>(null);
  const active = chats.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    const h = takeHandoff("chat");
    if (h?.message) send(h.message, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [active?.messages.length, ai.loading]);

  async function send(text: string, base: ChatSession | null = active) {
    const content = text.trim();
    if (!content || ai.loading) return;
    const session: ChatSession = base
      ? { ...base, messages: [...base.messages, { role: "user", content, at: Date.now() }], updatedAt: Date.now() }
      : { id: uid(), title: content.slice(0, 48), messages: [{ role: "user", content, at: Date.now() }], updatedAt: Date.now() };
    setChats((p) => [session, ...p.filter((c) => c.id !== session.id)]);
    setActiveId(session.id);
    setInput("");
    const r = await ai.run({ messages: session.messages.slice(-30).map(({ role, content }) => ({ role, content })) });
    if (r) {
      setChats((p) => p.map((c) => (c.id === session.id ? { ...c, messages: [...c.messages, { role: "assistant", content: r, at: Date.now() }], updatedAt: Date.now() } : c)));
    }
  }

  const retry = () => {
    if (!active) return;
    const last = active.messages[active.messages.length - 1];
    if (last?.role !== "user") return;
    ai.run({ messages: active.messages.slice(-30).map(({ role, content }) => ({ role, content })) }).then((r) => {
      if (r) setChats((p) => p.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, { role: "assistant", content: r, at: Date.now() }] } : c)));
    });
  };

  return (
    <div className="grid h-[calc(100vh-8.5rem)] gap-4 md:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col rounded-xl border bg-card p-3 shadow-card md:flex">
        <Button variant="ai" onClick={() => { setActiveId(null); ai.clearError(); }}><Plus className="h-4 w-4" /> New chat</Button>
        <p className="mb-1 mt-4 px-1 text-xs font-medium text-muted-foreground">History (this device)</p>
        <div className="flex-1 space-y-0.5 overflow-y-auto">
          {chats.length === 0 && <p className="px-1 text-xs text-muted-foreground">No conversations yet.</p>}
          {chats.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent ${c.id === activeId ? "bg-accent text-accent-foreground" : ""}`}>{c.title}</button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col rounded-xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-ai"><Bot className="h-4 w-4 text-ai-foreground dark:text-primary-foreground" /></div>
            <span className="text-sm font-semibold">WorkWise Assistant</span>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="md:hidden" onClick={() => setActiveId(null)}><Plus className="h-4 w-4" /> New</Button>
            {active && (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="sm" variant="ghost"><Trash2 className="h-3.5 w-3.5" /> Clear</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete this conversation?</AlertDialogTitle><AlertDialogDescription>This removes it from your history on this device.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setChats((p) => p.filter((c) => c.id !== active.id)); setActiveId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
          {!active ? (
            <div className="mx-auto flex max-w-xl flex-col items-center pt-8 text-center">
              <MessagesSquare className="mb-3 h-10 w-10 text-ai" />
              <h1 className="text-lg font-semibold">How can I help at work today?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Ask about writing, planning, explaining or brainstorming.</p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s, null)} className="rounded-lg border p-3 text-left text-sm transition hover:border-ai/40 hover:bg-ai-soft">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            active.messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
                {m.role === "assistant" && <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ai-soft"><Bot className="h-4 w-4 text-ai" /></div>}
                <div className={m.role === "user" ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground" : "min-w-0 max-w-[85%]"}>
                  {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown>{m.content}</Markdown>}
                  <div className={`mt-1.5 flex flex-wrap items-center gap-2 text-[11px] ${m.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {m.role === "assistant" && (
                      <>
                        <button onClick={() => copyText(m.content)} className="inline-flex items-center gap-1 hover:text-foreground"><Copy className="h-3 w-3" /> Copy</button>
                        {TOOL_LINKS.filter((t) => t.re.test(m.content)).slice(0, 2).map((t) => (
                          <Link key={t.to} to={t.to} className="inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-accent-foreground hover:bg-accent"><t.icon className="h-3 w-3" /> {t.label}</Link>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {ai.loading && <div className="flex items-center gap-2 text-sm text-ai"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>}
          {ai.error && <ErrorBox error={ai.error} onRetry={retry} />}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
            <Textarea
              aria-label="Message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Message WorkWise AI… (Shift+Enter for new line)"
              rows={1}
              className="max-h-40 min-h-[40px] resize-none border-0 shadow-none focus-visible:ring-0"
            />
            <Button variant="ai" size="icon" onClick={() => send(input)} disabled={!input.trim() || ai.loading} aria-label="Send message"><Send className="h-4 w-4" /></Button>
          </div>
          <div className="mt-2 flex justify-between"><AiNotice /><span className="hidden text-xs text-muted-foreground sm:inline">Avoid sharing confidential information.</span></div>
        </div>
      </section>
    </div>
  );
}
