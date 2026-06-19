/**
 * Line-comment support for the JSON editor.
 *
 * JSON has no comment syntax, but this app lets users annotate a document with
 * `--` line comments (everything from `--` to the end of the line). Before any
 * `JSON.parse`, the comments are stripped so the document still parses, formats,
 * and converts like ordinary JSON.
 */

export const COMMENT_PREFIX = "--";

/**
 * Remove `--` line comments from a JSON string. `--` inside a string literal is
 * left untouched; whitespace/newlines are preserved so character offsets and
 * line numbers stay aligned for error reporting.
 */
export function stripComments(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    // Start of a line comment (outside any string): drop to end of line,
    // keeping the newline so positions line up.
    if (ch === "-" && text[i + 1] === "-") {
      while (i < text.length && text[i] !== "\n") i++;
      if (i < text.length) out += "\n"; // re-emit the newline we stopped on
      continue;
    }

    out += ch;
  }

  return out;
}

/** True if the document contains at least one `--` line comment. */
export function hasComments(text: string): boolean {
  return stripComments(text) !== text;
}
