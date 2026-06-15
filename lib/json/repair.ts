import { jsonrepair } from "jsonrepair";

export interface RepairResult {
  /** The repaired JSON text (pretty-printed). */
  text: string;
  /** Whether anything was changed. */
  changed: boolean;
  /** Human-readable summary of the kinds of fixes that were applied. */
  fixes: string[];
  /** Set when repair failed entirely. */
  error?: string;
}

/**
 * Heuristically describe what kinds of problems were present in the original
 * text, so we can show the user a summary of fixes. These are best-effort:
 * jsonrepair doesn't report a structured changelog.
 */
function detectFixes(original: string): string[] {
  const fixes: string[] = [];
  const src = original;

  if (/'[^']*'\s*:/.test(src) || /:\s*'[^']*'/.test(src)) {
    fixes.push("Converted single quotes to double quotes");
  }
  if (/[{,]\s*[A-Za-z_$][\w$]*\s*:/.test(src)) {
    fixes.push("Added quotes around unquoted keys");
  }
  if (/,\s*[}\]]/.test(src)) {
    fixes.push("Removed trailing commas");
  }
  if (/\/\/[^\n]*|\/\*[\s\S]*?\*\//.test(src)) {
    fixes.push("Stripped comments");
  }
  if (/\b(True|False|None)\b/.test(src)) {
    fixes.push("Converted Python literals (True/False/None) to JSON");
  }
  if (/\bNaN\b|\bInfinity\b/.test(src)) {
    fixes.push("Replaced NaN/Infinity with null");
  }
  if (/}\s*{|]\s*\[|"\s*\n\s*"/.test(src)) {
    fixes.push("Joined or fixed concatenated values");
  }
  return fixes;
}

/** Count occurrences of a character that sit outside of any string literal. */
function countOutsideStrings(text: string, target: string): number {
  let count = 0;
  let inStr = false;
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === quote) inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
    } else if (c === target) {
      count++;
    }
  }
  return count;
}

/**
 * Insert missing colons between object keys and their values. jsonrepair handles
 * many cases but throws "Colon expected" on some (e.g. `{a 1}`, `{"a" null}`), so
 * we run this as a fallback. Strings and comments are passed through untouched.
 */
function insertMissingColons(src: string): string {
  const n = src.length;
  const isWs = (c: string) => c === " " || c === "\t" || c === "\n" || c === "\r";
  const DELIM = '{}[]:,"\'';
  const stack: { type: "object" | "array"; expect: "key" | "value" | "comma" }[] = [];
  const top = () => stack[stack.length - 1];

  let out = "";
  let i = 0;

  function readString(): string {
    const q = src[i];
    let s = src[i++];
    while (i < n) {
      const c = src[i];
      if (c === "\\") {
        s += c + (src[i + 1] ?? "");
        i += 2;
        continue;
      }
      s += c;
      i++;
      if (c === q) break;
    }
    return s;
  }

  function readWord(): string {
    let s = "";
    while (i < n && !isWs(src[i]) && !DELIM.includes(src[i])) {
      s += src[i++];
    }
    return s;
  }

  while (i < n) {
    const c = src[i];

    // Pass comments through verbatim.
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") out += src[i++];
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      out += src[i++] + src[i++];
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) out += src[i++];
      continue;
    }

    if (isWs(c)) {
      out += c;
      i++;
      continue;
    }
    if (c === "{") {
      out += c;
      i++;
      stack.push({ type: "object", expect: "key" });
      continue;
    }
    if (c === "[") {
      out += c;
      i++;
      stack.push({ type: "array", expect: "value" });
      continue;
    }
    if (c === "}" || c === "]") {
      out += c;
      i++;
      stack.pop();
      if (top()) top().expect = "comma";
      continue;
    }
    if (c === ",") {
      out += c;
      i++;
      const t = top();
      if (t) t.expect = t.type === "object" ? "key" : "value";
      continue;
    }
    if (c === ":") {
      out += c;
      i++;
      const t = top();
      if (t) t.expect = "value";
      continue;
    }

    // A key or value token.
    const t = top();
    const token = c === '"' || c === "'" ? readString() : readWord();
    out += token;

    if (t && t.type === "object" && t.expect === "key") {
      // Look past whitespace; if the next char isn't a colon, insert one.
      let j = i;
      while (j < n && isWs(src[j])) j++;
      if (src[j] !== ":") out += ":";
      t.expect = "value";
    } else if (t) {
      t.expect = "comma";
    }
  }

  return out;
}

/**
 * Add missing braces/brackets. jsonrepair closes unclosed containers but throws
 * on a missing *opening* brace (e.g. `"a":1}` or bare `"a":1, "b":2`). We balance
 * unmatched closers by prepending openers, and wrap a bare object body in `{ }`.
 */
function fixBraces(src: string): string {
  let t = src.trim();

  let inStr = false;
  let quote = "";
  let openCurly = 0;
  let closeCurly = 0; // unmatched closing braces
  let openSquare = 0;
  let closeSquare = 0;
  let depth = 0;
  let topLevelColon = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
    } else if (c === "{") {
      openCurly++;
      depth++;
    } else if (c === "}") {
      if (openCurly > 0) openCurly--;
      else closeCurly++;
      depth--;
    } else if (c === "[") {
      openSquare++;
      depth++;
    } else if (c === "]") {
      if (openSquare > 0) openSquare--;
      else closeSquare++;
      depth--;
    } else if (c === ":" && depth === 0) {
      topLevelColon = true;
    }
  }

  // Prepend openers for unmatched closing braces/brackets.
  if (closeSquare > 0) t = "[".repeat(closeSquare) + t;
  if (closeCurly > 0) t = "{".repeat(closeCurly) + t;

  // Bare object body (no enclosing container but has a top-level key:value).
  if (!/^[{[]/.test(t) && topLevelColon) t = `{${t}}`;

  return t;
}

/** Repair broken/relaxed JSON into strict JSON. */
export function repair(text: string, indent: number | string = 2): RepairResult {
  try {
    let repaired: string;
    try {
      repaired = jsonrepair(text);
    } catch (e) {
      // jsonrepair can't insert some missing colons or opening braces — try a
      // series of pre-passes (most comprehensive first) and retry.
      const attempts = [
        () => jsonrepair(fixBraces(insertMissingColons(text))),
        () => jsonrepair(fixBraces(text)),
        () => jsonrepair(insertMissingColons(text)),
      ];
      let fixed: string | undefined;
      for (const attempt of attempts) {
        try {
          fixed = attempt();
          break;
        } catch {
          /* try the next */
        }
      }
      if (fixed === undefined) throw e;
      repaired = fixed;
    }
    const pretty = JSON.stringify(JSON.parse(repaired), null, indent);
    const changed = pretty.trim() !== text.trim();
    let fixes = detectFixes(text);

    // The pretty output has exactly the right number of structural colons and
    // commas; if the original had fewer, jsonrepair inserted the missing ones.
    if (countOutsideStrings(pretty, ":") > countOutsideStrings(text, ":")) {
      fixes.push("Added missing colons");
    }
    if (countOutsideStrings(pretty, ",") > countOutsideStrings(text, ",")) {
      fixes.push("Added missing commas");
    }
    if (
      countOutsideStrings(pretty, "{") > countOutsideStrings(text, "{") ||
      countOutsideStrings(pretty, "}") > countOutsideStrings(text, "}")
    ) {
      fixes.push("Added missing braces");
    }
    if (
      countOutsideStrings(pretty, "[") > countOutsideStrings(text, "[") ||
      countOutsideStrings(pretty, "]") > countOutsideStrings(text, "]")
    ) {
      fixes.push("Added missing brackets");
    }

    if (changed && fixes.length === 0) {
      fixes = ["Normalized formatting and structure"];
    }
    return { text: pretty, changed, fixes: changed ? fixes : [] };
  } catch (e) {
    return {
      text,
      changed: false,
      fixes: [],
      error:
        e instanceof Error
          ? e.message
          : "Could not repair the input — the structure is too damaged.",
    };
  }
}
