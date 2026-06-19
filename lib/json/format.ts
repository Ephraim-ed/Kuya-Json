import { stripComments } from "./comments";
import { formatWithComments } from "./format-comments";

export type IndentStyle = "2" | "4" | "tab";

export interface FormatOptions {
  /** Preserve `--` line comments instead of stripping them. */
  keepComments?: boolean;
}

function indentValue(style: IndentStyle): string | number {
  if (style === "tab") return "\t";
  return Number(style);
}

function indentUnit(style: IndentStyle): string {
  return style === "tab" ? "\t" : " ".repeat(Number(style));
}

/** Pretty-print a JSON string with the given indentation. Throws on invalid JSON. */
export function format(
  text: string,
  indent: IndentStyle = "2",
  opts: FormatOptions = {},
): string {
  if (opts.keepComments) {
    // Validate structure first so malformed input still errors clearly.
    JSON.parse(stripComments(text));
    return formatWithComments(text, indentUnit(indent));
  }
  const parsed = JSON.parse(stripComments(text));
  return JSON.stringify(parsed, null, indentValue(indent));
}

/** Compress JSON to a single line. Throws on invalid JSON. */
export function minify(text: string): string {
  return JSON.stringify(JSON.parse(stripComments(text)));
}
