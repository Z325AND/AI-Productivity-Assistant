import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarCheck, Plus, Trash2, Wand2, Pencil, Check, X, Coffee, Users, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader, Panel, Field, AiNotice, ErrorBox, Thinking, EmptyState, useAi } from "@/components/ww/common";
import { aiPlan, type Plan } from "@/lib/ai.functions";
import { sortByPriority, useTasks, type Priority, type Task } from "@/lib/store";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — WorkWise AI" },
      { name: "description", content: "Prioritise tasks with an urgency-importance matrix and build realistic daily and weekly schedules." },
      { property: "og:title", content: "AI Task Planner — WorkWise AI" },
      { property: "og:description", content: "Smart prioritisation and realistic schedules for your workload." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannerPage,
});

const P: Priority[] = ["High", "Medium", "Low"];
function PSel({ value, onChange, label }: { value: Priority; onChange: (v: Priority) => void; label: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Priority)}>
      <SelectTrigger aria-label={label} className="h-9"><SelectValue /></SelectTrigger>
      <SelectContent>{P.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
    </Select>
  );
}

const blank = { title: "", description: "", deadline: "", duration: "", importance: "Medium" as Priority, urgency: "Medium" as Priority };

function TaskRow({ t }: { t: Task }) {
  const { update, remove } = useTasks();
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(t.title);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = t.deadline && !t.done && t.deadline < today;
  return (
    <li className="flex flex-wrap items-center gap-2 py-2.5">
      <Checkbox checked={t.done} onCheckedChange={(v) => update(t.id, { done: !!v })} aria-label={`Complete ${t.title}`} />
      {edit ? (
        <>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 flex-1" aria-label="Task title" />
          <Button size="icon" variant="ghost" aria-label="Save" onClick={() => { if (title.trim()) update(t.id, { title: title.trim() }); setEdit(false); }}><Check className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Cancel" onClick={() => { setTitle(t.title); setEdit(false); }}><X className="h-4 w-4" /></Button>
        </>
      ) : (
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t.deadline && <span className={overdue ? "text-destructive" : ""}>{overdue ? "Overdue · " : "Due "}{t.deadline}</span>}
            {t.duration ? ` · ${t.duration} min` : ""}{t.description ? ` · ${t.description}` : ""}
          </p>
        </div>
      )}
      <div className="flex items-center gap-1">
        <div className="w-24"><PSel label="Importance" value={t.importance} onChange={(v) => update(t.id, { importance: v })} /></div>
        <div className="w-24"><PSel label="Urgency" value={t.urgency} onChange={(v) => update(t.id, { urgency: v })} /></div>
        {!edit && <Button size="icon" variant="ghost" aria-label="Edit task" onClick={() => setEdit(true)}><Pencil className="h-3.5 w-3.5" /></Button>}
        <AlertDialog>
          <AlertDialogTrigger asChild><Button size="icon" variant="ghost" aria-label="Delete task"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this task?</AlertDialogTitle><AlertDialogDescription>“{t.title}” will be removed permanently.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { remove(t.id); toast.success("Task deleted"); }}>Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

function PlannerPage() {
  const { tasks, add } = useTasks();
  const [n, setN] = useState(blank);
  const [hours, setHours] = useState({ start: "09:00", end: "17:00" });
  const [breaks, setBreaks] = useState("10-minute break every 90 minutes, 30-minute lunch");
  const [commitments, setCommitments] = useState("");
  const [scope, setScope] = useState("Today");
  const [plan, setPlan] = useState<Plan | null>(null);
  const ai = useAi(aiPlan);

  const addTask = () => {
    if (!n.title.trim()) return void toast.error("Give the task a title");
    add({ title: n.title.trim(), description: n.description || undefined, deadline: n.deadline || undefined, duration: n.duration ? Number(n.duration) : undefined, importance: n.importance, urgency: n.urgency });
    setN(blank);
    toast.success("Task added");
  };

  const open = tasks.filter((t) => !t.done);
  const sorted = sortByPriority(tasks);
  const done = tasks.length - open.length;

  const generate = async () => {
    if (!open.length) return void toast.error("Add at least one open task first");
    const list = open.map((t) => `- ${t.title}${t.description ? ` (${t.description})` : ""} | importance: ${t.importance} | urgency: ${t.urgency} | deadline: ${t.deadline ?? "none"} | estimate: ${t.duration ? t.duration + " min" : "not given"}`).join("\n");
    const r = await ai.run({ prompt: `Today is ${new Date().toDateString()}. Plan scope: ${scope === "Today" ? "today only (one day)" : "the next 5 working days"}.\nWorking hours: ${hours.start}–${hours.end}\nBreak preferences: ${breaks}\nExisting commitments: ${commitments || "none"}\n\nTasks:\n${list}` });
    if (r) setPlan(r);
  };

  const blockClass = (type: string) => type === "break" ? "border-l-success bg-success/5" : type === "meeting" ? "border-l-warning bg-warning/10" : "border-l-ai bg-ai-soft";

  return (
    <>
      <PageHeader icon={CalendarCheck} title="AI Task Planner" description="Prioritise by urgency and importance, then let AI build a realistic schedule." />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Panel className="space-y-3">
            <h2 className="font-semibold">Add a task</h2>
            <Input aria-label="Task title" placeholder="Task title" value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <Input aria-label="Description" placeholder="Description (optional)" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Deadline" htmlFor="dl"><Input id="dl" type="date" value={n.deadline} onChange={(e) => setN({ ...n, deadline: e.target.value })} /></Field>
              <Field label="Estimate (min)" htmlFor="du"><Input id="du" type="number" min={5} step={5} value={n.duration} onChange={(e) => setN({ ...n, duration: e.target.value })} /></Field>
              <Field label="Importance"><PSel label="Importance" value={n.importance} onChange={(v) => setN({ ...n, importance: v })} /></Field>
              <Field label="Urgency"><PSel label="Urgency" value={n.urgency} onChange={(v) => setN({ ...n, urgency: v })} /></Field>
            </div>
            <Button onClick={addTask} className="w-full"><Plus className="h-4 w-4" /> Add task</Button>
          </Panel>
          <Panel className="space-y-3">
            <h2 className="font-semibold">Availability</h2>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Start" htmlFor="hs"><Input id="hs" type="time" value={hours.start} onChange={(e) => setHours({ ...hours, start: e.target.value })} /></Field>
              <Field label="End" htmlFor="he"><Input id="he" type="time" value={hours.end} onChange={(e) => setHours({ ...hours, end: e.target.value })} /></Field>
              <Field label="Plan for"><Select value={scope} onValueChange={setScope}><SelectTrigger aria-label="Plan scope"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Today">Today</SelectItem><SelectItem value="Week">This week</SelectItem></SelectContent></Select></Field>
            </div>
            <Field label="Break preferences" htmlFor="br"><Input id="br" value={breaks} onChange={(e) => setBreaks(e.target.value)} /></Field>
            <Field label="Meetings / commitments" htmlFor="cm"><Textarea id="cm" rows={2} value={commitments} onChange={(e) => setCommitments(e.target.value)} placeholder="e.g. 11:00–11:30 standup; Wed 14:00 client call" /></Field>
            <Button variant="ai" className="w-full" onClick={generate} disabled={ai.loading}><Wand2 className="h-4 w-4" /> {plan ? "Regenerate plan" : "Generate AI plan"}</Button>
          </Panel>
        </div>

        <div className="space-y-5 lg:col-span-3">
          <Panel>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Priority task list</h2>
              <span className="text-sm text-muted-foreground">{done}/{tasks.length} done</span>
            </div>
            <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} className="mb-2" />
            {sorted.length === 0 ? <EmptyState icon={CalendarCheck} title="No tasks yet" text="Add tasks on the left or send action items from the Meeting Summarizer." /> : (
              <ul className="divide-y">{sorted.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
            )}
          </Panel>

          <Panel>
            {ai.error && <div className="mb-4"><ErrorBox error={ai.error} onRetry={generate} /></div>}
            {ai.loading ? <Thinking label="Building your schedule…" /> : !plan ? (
              <EmptyState icon={Wand2} title="No AI plan yet" text="Set your availability and click Generate. Plans live inside WorkWise — nothing is added to an external calendar." />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><AiNotice /><span className="rounded-full bg-muted px-2 py-0.5 text-xs">In-app plan · not synced to a calendar</span></div>
                <p className="text-sm">{plan.summary}</p>
                <Tabs defaultValue="agenda">
                  <TabsList><TabsTrigger value="agenda">Agenda</TabsTrigger><TabsTrigger value="priority">Prioritisation</TabsTrigger><TabsTrigger value="insights">Insights</TabsTrigger></TabsList>
                  <TabsContent value="agenda" className="space-y-4">
                    <div className={plan.days.length > 1 ? "grid gap-4 md:grid-cols-2" : ""}>
                      {plan.days.map((d) => {
                        const mins = d.blocks.filter((b) => b.type === "task").reduce((s, b) => { const [h1, m1] = b.start.split(":").map(Number); const [h2, m2] = b.end.split(":").map(Number); return s + Math.max(0, (h2 ?? 0) * 60 + (m2 ?? 0) - (h1 ?? 0) * 60 - (m1 ?? 0)); }, 0);
                        return (
                          <div key={d.day}>
                            <p className="mb-2 flex justify-between text-sm font-semibold"><span>{d.day}</span><span className="font-normal text-muted-foreground">{Math.round(mins / 6) / 10}h focus</span></p>
                            <ol className="space-y-1.5">{d.blocks.map((b, i) => (
                              <li key={i} className={`flex items-center gap-3 rounded-md border-l-4 px-3 py-2 text-sm ${blockClass(b.type)}`}>
                                <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{b.start}–{b.end}</span>
                                {b.type === "break" ? <Coffee className="h-3.5 w-3.5 text-success" /> : b.type === "meeting" ? <Users className="h-3.5 w-3.5 text-warning" /> : null}
                                <span>{b.title}</span>
                              </li>
                            ))}</ol>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                  <TabsContent value="priority">
                    <div className="grid grid-cols-2 gap-2">
                      {(["Do first", "Schedule", "Delegate", "Eliminate"] as const).map((q) => (
                        <div key={q} className="rounded-lg border p-3">
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ai">{q}</p>
                          <ul className="space-y-1.5 text-sm">{plan.priorityOrder.filter((p) => p.quadrant === q).map((p, i) => <li key={i}><span className="font-medium">{p.task}</span><span className="block text-xs text-muted-foreground">{p.reason}</span></li>)}</ul>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="insights" className="space-y-3 text-sm">
                    <div><p className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> Conflicts & overload</p>{plan.conflicts.length ? <ul className="list-disc pl-5">{plan.conflicts.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="text-muted-foreground">None detected.</p>}</div>
                    <div><p className="mb-1 flex items-center gap-1.5 font-semibold"><Lightbulb className="h-4 w-4 text-ai" /> Time-saving tips</p><ul className="list-disc pl-5">{plan.tips.map((c, i) => <li key={i}>{c}</li>)}</ul></div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
