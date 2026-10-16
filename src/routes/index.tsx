import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Mail, FileText, CalendarCheck, Search, MessagesSquare, ShieldCheck, Bookmark, CheckCircle2, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Panel, EmptyState } from "@/components/ww/common";
import { setHandoff, sortByPriority, useSaved, useTasks, useUserName } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — WorkWise AI" },
      { name: "description", content: "Your AI workplace dashboard: tasks, deadlines, saved outputs and productivity tools." },
      { property: "og:title", content: "WorkWise AI — Work smarter. Communicate better. Achieve more." },
      { property: "og:description", content: "AI-powered workplace assistant for emails, meetings, planning and research." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const TOOLS = [
  { to: "/email", icon: Mail, title: "Smart Email Generator", text: "Draft professional, context-aware emails in seconds." },
  { to: "/meetings", icon: FileText, title: "Meeting Summarizer", text: "Turn raw notes into decisions and action items." },
  { to: "/planner", icon: CalendarCheck, title: "AI Task Planner", text: "Prioritise work and build a realistic schedule." },
  { to: "/research", icon: Search, title: "Research Assistant", text: "Digest reports and get clear recommendations." },
  { to: "/chat", icon: MessagesSquare, title: "Workplace Chat", text: "Ask a helpful AI colleague anything." },
] as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const navigate = useNavigate();
  const { tasks, update } = useTasks();
  const { items } = useSaved();
  const [name] = useUserName();
  const [q, setQ] = useState("");
  const [hello, setHello] = useState("Hello");
  useEffect(() => { setHello(greeting()); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const upcoming = sortByPriority(tasks.filter((t) => !t.done && t.deadline)).slice(0, 5);
  const top = sortByPriority(tasks).slice(0, 6);
  const plannedMin = tasks.filter((t) => !t.done).reduce((s, t) => s + (t.duration ?? 0), 0);

  const ask = () => {
    if (!q.trim()) return;
    setHandoff({ to: "chat", data: { message: q.trim() } });
    navigate({ to: "/chat" });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {hello}{name ? `, ${name}` : ""}! <span className="text-muted-foreground">What would you like to accomplish today?</span>
        </h1>
        <div className="mt-5 flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
          <Textarea
            aria-label="Ask WorkWise AI"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
            }}
            placeholder="Ask WorkWise AI anything..."
            className="min-h-[44px] resize-none border-0 shadow-none focus-visible:ring-0"
            rows={1}
          />
          <Button variant="ai" onClick={ask} disabled={!q.trim()} aria-label="Send to AI chat">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([["Generate email", "/email"], ["Summarize meeting", "/meetings"], ["Plan my tasks", "/planner"], ["Research a topic", "/research"]] as const).map(([l, to]) => (
            <Button key={to} variant="soft" size="sm" asChild>
              <Link to={to}>{l}</Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className="group rounded-xl border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-ai/40">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-ai-soft text-ai"><t.icon className="h-4.5 w-4.5" /></div>
            <p className="text-sm font-semibold">{t.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.text}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-ai">Open <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" /></span>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Today's tasks</h2>
            <Button variant="ghost" size="sm" asChild><Link to="/planner">Open planner</Link></Button>
          </div>
          {top.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No tasks yet" text="Add tasks in the planner or convert meeting action items into tasks." />
          ) : (
            <ul className="divide-y">
              {top.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <Checkbox checked={t.done} onCheckedChange={(v) => update(t.id, { done: !!v })} aria-label={`Mark ${t.title} done`} />
                  <span className={t.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>{t.title}</span>
                  {t.deadline && <span className={`text-xs ${t.deadline < today && !t.done ? "text-destructive" : "text-muted-foreground"}`}>{t.deadline}</span>}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{t.urgency}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-3 font-semibold">Productivity insights</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-sm"><span>Completed</span><span className="font-medium">{done}/{tasks.length}</span></div>
              <Progress value={pct} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-muted p-3"><p className="text-xl font-semibold">{tasks.length - done}</p><p className="text-xs text-muted-foreground">Open tasks</p></div>
              <div className="rounded-lg bg-muted p-3"><p className="text-xl font-semibold">{Math.round(plannedMin / 6) / 10}h</p><p className="text-xs text-muted-foreground">Planned time</p></div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Upcoming deadlines</p>
              {upcoming.length === 0 ? <p className="text-xs text-muted-foreground">No deadlines set.</p> : (
                <ul className="space-y-1.5">
                  {upcoming.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span className="flex-1 truncate">{t.title}</span><span className="text-xs text-muted-foreground">{t.deadline}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recently saved</h2>
            <Button variant="ghost" size="sm" asChild><Link to="/saved">View all</Link></Button>
          </div>
          {items.length === 0 ? (
            <EmptyState icon={Bookmark} title="Nothing saved yet" text="Save emails, summaries, research and prompts to find them here." />
          ) : (
            <ul className="divide-y">
              {items.slice(0, 5).map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="rounded bg-ai-soft px-1.5 py-0.5 text-[11px] font-medium capitalize text-accent-foreground">{i.kind}</span>
                  <span className="flex-1 truncate">{i.title}</span>
                  <span className="text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="bg-ai-soft">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ai" />
            <div className="text-sm">
              <p className="font-semibold">Use AI responsibly</p>
              <p className="mt-1 text-muted-foreground">AI can make mistakes. Review important facts, names, dates, figures and commitments before sharing. Keep confidential data out of prompts.</p>
              <Link to="/settings" className="mt-2 inline-block text-xs font-medium text-ai underline">About Responsible AI</Link>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
