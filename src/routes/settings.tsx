import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings, Trash2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Field, PrivacyHint } from "@/components/ww/common";
import { clearAllData, useUserName } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings & Privacy — WorkWise AI" },
    { name: "description", content: "Manage your display name, device-local data and responsible AI preferences." },
    { property: "og:title", content: "Settings & Privacy — WorkWise AI" },
    { property: "og:description", content: "Manage your WorkWise AI profile and privacy on this device." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SettingsPage,
});
function SettingsPage() {
  const [name, setName] = useUserName();
  const [draft, setDraft] = useState<string | null>(null);
  return <>
    <PageHeader icon={Settings} title="Settings & Privacy" description="Manage your profile and data on this device." />
    <section className="max-w-2xl space-y-4 border-b pb-6">
      <h2 className="font-semibold">Profile</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setName((draft ?? name).trim()); toast.success("Profile saved"); }}>
        <Field label="Display name" htmlFor="display-name"><Input id="display-name" value={draft ?? name} maxLength={80} onChange={(e) => setDraft(e.target.value)} placeholder="Your name" /></Field>
        <Button type="submit" variant="outline"><Save className="h-4 w-4" /> Save profile</Button>
      </form>
    </section>
    <section className="max-w-2xl space-y-3 border-b py-6">
      <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-ai" /> Responsible AI</h2>
      <p className="text-sm text-muted-foreground">AI can make mistakes. Check facts, names, dates and commitments before sharing generated content.</p>
      <PrivacyHint />
      <p className="text-sm text-muted-foreground">Tasks, saved items and conversations are stored in this browser, not a shared account. Content submitted to AI tools is sent to the AI service for processing. Research does not have live web access.</p>
    </section>
    <section className="max-w-2xl space-y-3 py-6">
      <h2 className="font-semibold">Device data</h2>
      <p className="text-sm text-muted-foreground">Permanently remove tasks, saved items, chats and your display name from this browser.</p>
      <Button variant="destructive" onClick={() => { if (window.confirm("Delete all tasks, saved items, chats and your display name from this browser? This cannot be undone.")) { clearAllData(); setDraft(null); toast.success("Device data cleared"); } }}><Trash2 className="h-4 w-4" /> Clear device data</Button>
    </section>
  </>;
}
