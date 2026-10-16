import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Mail, FileText, CalendarCheck, Search, MessagesSquare, FlaskConical,
  Bookmark, Settings, Bell, Moon, Sun, Bot, User,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Logo } from "./common";
import { useSaved, useTasks, useUserName } from "@/lib/store";

export const NAV = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Smart Email Generator", url: "/email", icon: Mail },
  { title: "Meeting Summarizer", url: "/meetings", icon: FileText },
  { title: "AI Task Planner", url: "/planner", icon: CalendarCheck },
  { title: "Research Assistant", url: "/research", icon: Search },
  { title: "Workplace Chat", url: "/chat", icon: MessagesSquare },
  { title: "Prompt Lab", url: "/prompt-lab", icon: FlaskConical },
] as const;
const NAV2 = [
  { title: "Saved Items", url: "/saved", icon: Bookmark },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const item = (i: (typeof NAV)[number] | (typeof NAV2)[number]) => (
    <SidebarMenuItem key={i.url}>
      <SidebarMenuButton asChild isActive={path === i.url} tooltip={i.title}>
        <Link to={i.url} onClick={() => setOpenMobile(false)}>
          <i.icon className="h-4 w-4" />
          <span>{i.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-3">
        <Logo compact={collapsed} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{NAV.map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{NAV2.map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter>
          <p className="px-2 pb-2 text-[11px] leading-snug text-muted-foreground">
            Work smarter. Communicate better. Achieve more.
          </p>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ww.theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const { items } = useSaved();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const ql = q.toLowerCase().trim();
  const toolHits = ql ? [...NAV, ...NAV2].filter((n) => n.title.toLowerCase().includes(ql)) : [];
  const savedHits = ql ? items.filter((i) => (i.title + i.content).toLowerCase().includes(ql)).slice(0, 5) : [];
  const taskHits = ql ? tasks.filter((t) => t.title.toLowerCase().includes(ql)).slice(0, 5) : [];
  const go = (to: string) => {
    setQ("");
    navigate({ to });
  };
  const has = toolHits.length + savedHits.length + taskHits.length > 0;
  return (
    <Popover open={ql.length > 0}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search tools, saved items and tasks" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQ("")} placeholder="Search tools, saved items, tasks…" className="h-9 pl-8" />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-72 p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
        {!has && <p className="p-2 text-sm text-muted-foreground">No matches.</p>}
        {toolHits.map((t) => (
          <button key={t.url} onClick={() => go(t.url)} className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent">
            <t.icon className="h-4 w-4 text-ai" /> {t.title}
          </button>
        ))}
        {savedHits.map((s) => (
          <button key={s.id} onClick={() => go("/saved")} className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent">
            <Bookmark className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{s.title}</span>
          </button>
        ))}
        {taskHits.map((t) => (
          <button key={t.id} onClick={() => go("/planner")} className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{t.title}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function Notifications() {
  const { tasks } = useTasks();
  const today = new Date().toISOString().slice(0, 10);
  const due = tasks.filter((t) => !t.done && t.deadline && t.deadline <= today);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {due.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="mb-2 text-sm font-medium">Notifications</p>
        {due.length === 0 ? (
          <p className="text-sm text-muted-foreground">You're all caught up. No tasks due today or overdue.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {due.map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <span className="truncate">{t.title}</span>
                <span className="shrink-0 text-xs text-destructive">{t.deadline! < today ? "Overdue" : "Due today"}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { dark, toggle } = useTheme();
  const [name] = useUserName();
  const navigate = useNavigate();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-5">
            <SidebarTrigger aria-label="Toggle navigation" />
            <div className="md:hidden"><Logo compact /></div>
            <div className="ml-1 hidden flex-1 sm:block"><GlobalSearch /></div>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="soft" size="sm" onClick={() => navigate({ to: "/chat" })}>
                <Bot className="h-4 w-4" /> <span className="hidden sm:inline">Ask AI</span>
              </Button>
              <Notifications />
              <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Profile menu">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {name ? name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{name || "Guest (this device)"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Settings & privacy</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/saved" })}>Saved items</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 bg-gradient-page">
            <div className="mx-auto w-full max-w-6xl p-4 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
