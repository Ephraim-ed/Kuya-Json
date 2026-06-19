/// <reference lib="webworker" />
import { format, minify, type IndentStyle } from "../json/format";
import { validate } from "../json/validate";
import { repair } from "../json/repair";
import { anonymize, ConsistentFaker, type AnonRule } from "../json/anonymize";
import { buildTree } from "../json/tree";
import { sortKeys, type SortOrder } from "../json/transform";
import { stripComments } from "../json/comments";

export type WorkerRequest =
  | { id: number; op: "format"; text: string; indent: IndentStyle; keepComments?: boolean }
  | { id: number; op: "minify"; text: string }
  | { id: number; op: "validate"; text: string }
  | { id: number; op: "repair"; text: string; indent: number }
  | { id: number; op: "anonymize"; text: string; rules: AnonRule[] }
  | { id: number; op: "tree"; text: string }
  | { id: number; op: "sort"; text: string; order: SortOrder; indent: IndentStyle };

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

function indentNumber(indent: IndentStyle): number | string {
  return indent === "tab" ? "\t" : Number(indent);
}

function handle(msg: WorkerRequest): unknown {
  switch (msg.op) {
    case "format":
      return format(msg.text, msg.indent, { keepComments: msg.keepComments });
    case "minify":
      return minify(msg.text);
    case "validate":
      return validate(msg.text);
    case "repair":
      return repair(msg.text, msg.indent);
    case "anonymize": {
      const parsed = JSON.parse(stripComments(msg.text));
      const { value, count } = anonymize(parsed, msg.rules, new ConsistentFaker());
      return { text: JSON.stringify(value, null, 2), count };
    }
    case "tree":
      return buildTree(JSON.parse(stripComments(msg.text)));
    case "sort":
      return JSON.stringify(
        sortKeys(JSON.parse(stripComments(msg.text)), msg.order),
        null,
        indentNumber(msg.indent),
      );
  }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  try {
    const result = handle(msg);
    const res: WorkerResponse = { id: msg.id, ok: true, result };
    (self as DedicatedWorkerGlobalScope).postMessage(res);
  } catch (err) {
    const res: WorkerResponse = {
      id: msg.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    (self as DedicatedWorkerGlobalScope).postMessage(res);
  }
};
