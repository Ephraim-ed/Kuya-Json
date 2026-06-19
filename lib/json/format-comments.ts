/**
 * Comment-preserving JSON pretty-printer.
 *
 * The normal `format` strips `--` comments before `JSON.parse`, so they are
 * lost. This formatter tokenizes the document (keeping comments) and reprints
 * it with the chosen indentation, re-attaching comments where they belong:
 *
 *  - a comment on its own line  → kept as a standalone line at that depth
 *  - a comment trailing content → kept at the end of that line
 */

import { COMMENT_PREFIX } from "./comments";

type Token =
  | { kind: "punct"; value: string; nlBefore: boolean }
  | { kind: "value"; value: string; nlBefore: boolean }
  | { kind: "comment"; value: string; nlBefore: boolean };

function tokenize(text: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  const n = text.length;
  let nlBefore = true; // the first token counts as starting a line

  const push = (kind: Token["kind"], value: string) => {
    toks.push({ kind, value, nlBefore } as Token);
    nlBefore = false;
  };

  while (i < n) {
    const c = text[i];

    if (c === "\n") {
      nlBefore = true;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }

    // Line comment: `--` to end of line.
    if (c === "-" && text[i + 1] === "-") {
      let j = i;
      while (j < n && text[j] !== "\n") j++;
      push("comment", text.slice(i, j).trimEnd());
      i = j;
      continue;
    }

    if (c === "{" || c === "}" || c === "[" || c === "]" || c === ":" || c === ",") {
      push("punct", c);
      i++;
      continue;
    }

    if (c === '"') {
      // String literal (capture raw, respecting escapes).
      let j = i + 1;
      while (j < n) {
        if (text[j] === "\\") {
          j += 2;
          continue;
        }
        if (text[j] === '"') {
          j++;
          break;
        }
        j++;
      }
      push("value", text.slice(i, j));
      i = j;
      continue;
    }

    // Number / true / false / null — read until a delimiter.
    let j = i;
    while (
      j < n &&
      !" \t\r\n,{}[]:".includes(text[j]) &&
      !(text[j] === "-" && text[j + 1] === "-")
    ) {
      j++;
    }
    if (j === i) {
      // Unrecognized character — bail; caller will fall back to plain format.
      throw new SyntaxError(`Unexpected character '${c}' at position ${i}`);
    }
    push("value", text.slice(i, j));
    i = j;
  }

  return toks;
}

/** Pretty-print JSON while preserving `--` line comments. Throws on malformed input. */
export function formatWithComments(text: string, indentUnit: string): string {
  const toks = tokenize(text);
  let pos = 0;

  const peek = () => toks[pos];
  const next = () => toks[pos++];
  const indent = (lvl: number) => indentUnit.repeat(lvl);

  /** A comment with no newline before it trails the previous token. */
  const trailingComment = (): string => {
    const t = peek();
    if (t && t.kind === "comment" && !t.nlBefore) {
      next();
      return " " + t.value;
    }
    return "";
  };

  /** Collect standalone (own-line) comments as fully-indented lines. */
  const standaloneComments = (lvl: number, lines: string[]) => {
    while (peek() && peek().kind === "comment" && peek().nlBefore) {
      lines.push(indent(lvl) + next().value);
    }
  };

  function printValue(lvl: number): string {
    const t = peek();
    if (!t) throw new SyntaxError("Unexpected end of input");
    if (t.kind === "punct" && t.value === "{") return printObject(lvl);
    if (t.kind === "punct" && t.value === "[") return printArray(lvl);
    if (t.kind === "value") return next().value;
    throw new SyntaxError(`Unexpected token '${t.value}'`);
  }

  function printObject(lvl: number): string {
    next(); // {
    const inner = lvl + 1;
    const lines: string[] = [];
    for (;;) {
      standaloneComments(inner, lines);
      const t = peek();
      if (!t) throw new SyntaxError("Unterminated object");
      if (t.kind === "punct" && t.value === "}") break;
      if (t.kind !== "value") throw new SyntaxError("Expected object key");
      const key = next().value;
      const colon = next();
      if (!colon || colon.kind !== "punct" || colon.value !== ":") {
        throw new SyntaxError("Expected ':' after object key");
      }
      const val = printValue(inner);
      const comma =
        peek() && peek().kind === "punct" && peek().value === "," ? (next(), ",") : "";
      const trailing = trailingComment();
      lines.push(`${indent(inner)}${key}: ${val}${comma}${trailing}`);
    }
    next(); // }
    if (lines.length === 0) return "{}";
    return `{\n${lines.join("\n")}\n${indent(lvl)}}`;
  }

  function printArray(lvl: number): string {
    next(); // [
    const inner = lvl + 1;
    const lines: string[] = [];
    for (;;) {
      standaloneComments(inner, lines);
      const t = peek();
      if (!t) throw new SyntaxError("Unterminated array");
      if (t.kind === "punct" && t.value === "]") break;
      const val = printValue(inner);
      const comma =
        peek() && peek().kind === "punct" && peek().value === "," ? (next(), ",") : "";
      const trailing = trailingComment();
      lines.push(`${indent(inner)}${val}${comma}${trailing}`);
    }
    next(); // ]
    if (lines.length === 0) return "[]";
    return `[\n${lines.join("\n")}\n${indent(lvl)}]`;
  }

  // Top level: comments may surround the root value.
  const out: string[] = [];
  standaloneComments(0, out);
  const root = printValue(0);
  const rootLine = root + trailingComment();
  out.push(rootLine);
  standaloneComments(0, out);

  // Guard against leftover tokens (malformed input).
  if (pos !== toks.length) {
    throw new SyntaxError("Unexpected trailing content");
  }

  return out.join("\n");
}

// Re-exported so callers can build a leading marker if needed.
export { COMMENT_PREFIX };
