import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, EmptyState, Markdown, CopyButton } from "@/components/ww/common";
import { useSaved } from "@/lib/store";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [
    { title: "Saved Items — WorkWise AI" },
    { name: "description", content: "Find and manage your saved emails, meeting summaries, research and prompts on this device." },
    { property: "og:title", content: "Saved Items — WorkWise AI" },
    { property: "og:description", content: "Your saved workplace outputs in one library." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SavedPage,
});
function SavedPage() {
  const { items, remove } = useSaved();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const visible = items.filter((i) => `${i.title} ${i.content} ${i.kind}`.toLowerCase().includes(query.toLowerCase()));
  const current = items.find((i) => i.id === selected);
  return <>
    <PageHeader icon={Bookmark} title="Saved Items" description="Your saved work on this device." />
    <Input aria-label="Search saved items" placeholder="Search saved items…" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-5 max-w-md" />
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-2">{visible.length ? visible.map((i) => <Panel key={i.id}><Button variant="ghost" className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => setSelected(i.id)}>{i.title}</Button><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs capitalize text-muted-foreground">{i.kind} · {new Date(i.createdAt).toLocaleDateString()}</span><Button size="icon" variant="ghost" aria-label={`Delete ${i.title}`} onClick={() => { if (window.confirm(`Delete “${i.title}”?`)) remove(i.id); }}><Trash2 className="h-4 w-4" /></Button></div></Panel>) : <EmptyState icon={Bookmark} title={query ? "No matches" : "Nothing saved yet"} text="Your saved work will appear here." />}</div>
      <Panel className="min-w-0 lg:col-span-3">{current ? <div className="space-y-4 break-words"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{current.title}</h2><CopyButton text={current.content} /></div><Markdown>{current.content}</Markdown></div> : <EmptyState icon={Bookmark} title="Saved item" text="No item selected." />}</Panel>
    </div>
  </>;
}
