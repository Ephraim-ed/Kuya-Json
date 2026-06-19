import { stripComments } from "./comments";

export interface JsonError {
  /** Human-readable explanation. */
  message: string;
  /** 1-based line number, when known. */
  line?: number;
  /** 1-based column number, when known. */
  column?: number;
  /** 0-based character offset into the source, when known. */
  position?: number;
}

export type ValidateResult =
  | { ok: true; value: unknown }
  | { ok: false; error: JsonError };

/** Convert a 0-based character offset into 1-based line/column. */
export function offsetToLineCol(text: string, offset: number): {
  line: number;
  column: number;
} {
  let line = 1;
  let column = 1;
  const max = Math.min(offset, text.length);
  for (let i = 0; i < max; i++) {
    if (text[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

/**
 * Turn V8/SpiderMonkey JSON.parse error messages into something friendlier and,
 * where possible, extract a character position so we can compute line/column.
 */
function humanizeParseError(text: string, raw: string): JsonError {
  // V8: "Unexpected token } in JSON at position 42"
  // V8 (newer): "Expected ',' or '}' after property value in JSON at position 42"
  // Firefox: "JSON.parse: expected ',' ... at line 3 column 5 of the JSON data"
  let position: number | undefined;
  let line: number | undefined;
  let column: number | undefined;

  const posMatch = raw.match(/at position (\d+)/);
  if (posMatch) {
    position = Number(posMatch[1]);
    const lc = offsetToLineCol(text, position);
    line = lc.line;
    column = lc.column;
  }

  const lineColMatch = raw.match(/at line (\d+) column (\d+)/);
  if (lineColMatch) {
    line = Number(lineColMatch[1]);
    column = Number(lineColMatch[2]);
  }

  // Some V8 versions append "(line X column Y)".
  const lcParen = raw.match(/line (\d+) column (\d+)/);
  if (!lineColMatch && lcParen) {
    line = Number(lcParen[1]);
    column = Number(lcParen[2]);
  }

  let message = raw;
  const lower = raw.toLowerCase();

  if (/unexpected end of (json|data)/.test(lower) || lower.includes("end of data")) {
    message =
      "Unexpected end of input — a bracket, brace, or quote was left unclosed.";
  } else if (lower.includes("trailing comma")) {
    message = "Trailing commas are not allowed in JSON.";
  } else if (/unexpected token '?,/.test(lower)) {
    message = "Unexpected comma — there may be a trailing or doubled comma.";
  } else if (/expected ',' or/.test(lower) || /expected ,/.test(lower)) {
    message = "Missing comma between values.";
  } else if (/expected ':'/.test(lower) || lower.includes("after property name")) {
    message = "Missing colon ':' between a key and its value.";
  } else if (/unexpected token '?}/.test(lower)) {
    message = "Unexpected '}' — check for a trailing comma or a missing value.";
  } else if (/unexpected token '?]/.test(lower)) {
    message = "Unexpected ']' — check for a trailing comma or a missing value.";
  } else if (
    lower.includes("unexpected token '") ||
    lower.includes("unexpected non-whitespace")
  ) {
    // Often a single-quoted string, unquoted key, or stray character.
    message =
      "Unexpected character — keys and strings must use double quotes, and values must be valid JSON.";
  } else if (lower.includes("bad control character")) {
    message =
      "A string contains a raw control character (e.g. a literal newline or tab). Escape it as \\n or \\t.";
  }

  if (line != null) {
    message += ` (line ${line}${column != null ? `, column ${column}` : ""})`;
  }

  return { message, line, column, position };
}

/** Validate a JSON string, returning friendly error info on failure. */
export function validate(text: string): ValidateResult {
  if (text.trim() === "") {
    return { ok: false, error: { message: "Input is empty." } };
  }
  try {
    return { ok: true, value: JSON.parse(stripComments(text)) };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return { ok: false, error: humanizeParseError(text, raw) };
  }
}
