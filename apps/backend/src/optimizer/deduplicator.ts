import { createHash } from "crypto";
import { Task }       from "../types";

interface PendingEntry {
  promise: Promise<any>;
  resolve: (val: any) => void;
}

// Şu an çalışan task'ları bellekte tut
const inFlight = new Map<string, PendingEntry>();

function hashTask(task: Task): string {
  return createHash("sha256")
    .update(task.projectId + task.input)
    .digest("hex")
    .slice(0, 16);
}

// Aynı task zaten çalışıyor mu?
export async function checkDuplicate(task: Task): Promise<any | null> {
  const key      = hashTask(task);
  const existing = inFlight.get(key);
  if (existing) {
    console.log(`[Dedup] Aynı task çalışıyor, sonuç bekleniyor: ${key}`);
    return existing.promise;
  }
  return null;
}

// Task'ı "çalışıyor" olarak işaretle
export function registerTask(task: Task): void {
  const key = hashTask(task);
  let resolveFn!: (val: any) => void;
  const promise = new Promise((res) => { resolveFn = res; });
  inFlight.set(key, { promise, resolve: resolveFn });
}

// Task tamamlandı, bekleyenlere sonucu gönder
export function resolveTask(task: Task, result: any): void {
  const key     = hashTask(task);
  const pending = inFlight.get(key);
  if (pending) {
    pending.resolve(result);
    inFlight.delete(key);
  }
}