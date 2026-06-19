"use client";

import type { WorkerRequest, WorkerResponse } from "./json.worker";
import { format, minify, type IndentStyle } from "../json/format";
import { validate } from "../json/validate";
import { repair } from "../json/repair";
import { anonymize, ConsistentFaker, type AnonRule } from "../json/anonymize";
import { buildTree } from "../json/tree";
import { sortKeys, type SortOrder } from "../json/transform";
import { stripComments } from "../json/comments";

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./json.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
    worker.onerror = () => {
      // Disable the worker on hard failure; callers fall back to main thread.
      worker = null;
    };
    return worker;
  } catch {
    worker = null;
    return null;
  }
}

/** Distributive Omit so each union member keeps its own fields. */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

/** Run an op on the worker; fall back to the main thread if unavailable. */
function run<T>(req: WithoutId<WorkerRequest>, fallback: () => T): Promise<T> {
  const w = getWorker();
  if (!w) return Promise.resolve(fallback());
  const id = nextId++;
  const message = { ...req, id } as WorkerRequest;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (v: unknown) => void,
      reject: (e) => {
        // On worker error, try the synchronous fallback before rejecting.
        try {
          resolve(fallback());
        } catch {
          reject(e);
        }
      },
    });
    w.postMessage(message);
  });
}

// --- typed wrappers --------------------------------------------------------

export function runFormat(text: string, indent: IndentStyle, keepComments = false) {
  return run<string>({ op: "format", text, indent, keepComments }, () =>
    format(text, indent, { keepComments }),
  );
}

export function runMinify(text: string) {
  return run<string>({ op: "minify", text }, () => minify(text));
}

export function runRepair(text: string, indent = 2) {
  return run({ op: "repair", text, indent }, () => repair(text, indent));
}

export function runAnonymize(text: string, rules: AnonRule[]) {
  return run<{ text: string; count: number }>(
    { op: "anonymize", text, rules },
    () => {
      const { value, count } = anonymize(
        JSON.parse(stripComments(text)),
        rules,
        new ConsistentFaker(),
      );
      return { text: JSON.stringify(value, null, 2), count };
    },
  );
}

export function runTree(text: string) {
  return run({ op: "tree", text }, () => buildTree(JSON.parse(stripComments(text))));
}

export function runSort(text: string, order: SortOrder, indent: IndentStyle) {
  return run<string>({ op: "sort", text, order, indent }, () =>
    JSON.stringify(
      sortKeys(JSON.parse(stripComments(text)), order),
      null,
      indent === "tab" ? "\t" : Number(indent),
    ),
  );
}

export { validate };
