import { useEffect, useState, useCallback } from "react";

// Device-local persistence. Data lives in this browser only.
export type Priority = "High" | "Medium" | "Low";
export type Task = {
  id: string;
  title: string;
  description?: string | undefined;
  deadline?: string | undefined;
  duration?: number | undefined;
  importance: Priority;
  urgency: Priority;
  done: boolean;
  source?: string | undefined;
  createdAt: number;
};
export type SavedItem = {
  id: string;
  kind: "email" | "meeting" | "research" | "prompt" | "chat";
  title: string;
  content: string;
  createdAt: number;
};
export type ChatMsg = { role: "user" | "assistant"; content: string; at: number };
export type ChatSession = { id: string; title: string; messages: ChatMsg[]; updatedAt: number };

const KEYS = { tasks: "ww.tasks", saved: "ww.saved", chats: "ww.chats", handoff: "ww.handoff", name: "ww.name" };

const listeners = new Map<string, Set<() => void>>();
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  listeners.get(key)?.forEach((l) => l());
}

function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    setValue(read(key, fallback));
    const l = () => setValue(read(key, fallback));
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(l);
    return () => void listeners.get(key)!.delete(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
      write(key, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set] as const;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function useTasks() {
  const [tasks, setTasks] = useStored<Task[]>(KEYS.tasks, []);
  return {
    tasks,
    add: (t: Omit<Task, "id" | "createdAt" | "done"> & { done?: boolean }) =>
      setTasks((p) => [{ ...t, id: uid(), createdAt: Date.now(), done: t.done ?? false }, ...p]),
    addMany: (ts: Omit<Task, "id" | "createdAt" | "done">[]) =>
      setTasks((p) => [...ts.map((t) => ({ ...t, id: uid(), createdAt: Date.now(), done: false })), ...p]),
    update: (id: string, patch: Partial<Task>) =>
      setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    remove: (id: string) => setTasks((p) => p.filter((t) => t.id !== id)),
  };
}

export function useSaved() {
  const [items, setItems] = useStored<SavedItem[]>(KEYS.saved, []);
  return {
    items,
    save: (i: Omit<SavedItem, "id" | "createdAt">) =>
      setItems((p) => [{ ...i, id: uid(), createdAt: Date.now() }, ...p]),
    remove: (id: string) => setItems((p) => p.filter((x) => x.id !== id)),
    clear: () => setItems([]),
  };
}

export function useChats() {
  const [chats, setChats] = useStored<ChatSession[]>(KEYS.chats, []);
  return { chats, setChats };
}

export function useUserName() {
  return useStored<string>(KEYS.name, "");
}

// One-shot handoff between tools (e.g. research -> email draft).
export type Handoff = { to: string; data: Record<string, string> };
export function setHandoff(h: Handoff) {
  sessionStorage.setItem(KEYS.handoff, JSON.stringify(h));
}
export function takeHandoff(to: string): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(KEYS.handoff);
    if (!raw) return null;
    const h = JSON.parse(raw) as Handoff;
    if (h.to !== to) return null;
    sessionStorage.removeItem(KEYS.handoff);
    return h.data;
  } catch {
    return null;
  }
}

export function clearAllData() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  Object.values(KEYS).forEach((k) => listeners.get(k)?.forEach((l) => l()));
}

const rank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
export function sortByPriority(tasks: Task[]) {
  return [...tasks].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      rank[a.urgency] + rank[a.importance] - (rank[b.urgency] + rank[b.importance]) ||
      (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"),
  );
}
