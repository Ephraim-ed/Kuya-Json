export interface SourceRange {
  /** 0-based start offset (inclusive). */
  from: number;
  /** 0-based end offset (exclusive). */
  to: number;
}

/**
 * Parse JSON text and record the source character range of every value, keyed by
 * its JSONPath (matching the format produced by `buildTree`/`tree.ts`).
 *
 * This is a tolerant single-pass scanner: on malformed input it returns whatever
 * it managed to locate before the error rather than throwing.
 */
export function locateAll(text: string): Map<string, SourceRange> {
  const map = new Map<string, SourceRange>();
  let i = 0;
  const n = text.length;

  const isWs = (c: string) => c === " " || c === "\t" || c === "\n" || c === "\r";
  function skipWs() {
    while (i < n) {
      if (isWs(text[i])) {
        i++;
      } else if (text[i] === "-" && text[i + 1] === "-") {
        // `--` line comment: skip to end of line.
        while (i < n && text[i] !== "\n") i++;
      } else {
        break;
      }
    }
  }

  function childPath(parent: string, key: string | number): string {
    if (typeof key === "number") return `${parent}[${key}]`;
    if (/^[A-Za-z_$][\w$]*$/.test(key)) return `${parent}.${key}`;
    return `${parent}['${key.replace(/'/g, "\\'")}']`;
  }

  /** Read a JSON string starting at `i` (on the opening quote); return decoded value. */
  function readString(): string {
    let out = "";
    i++; // opening quote
    while (i < n) {
      const c = text[i];
      if (c === "\\") {
        const next = text[i + 1];
        switch (next) {
          case "n": out += "\n"; break;
          case "t": out += "\t"; break;
          case "r": out += "\r"; break;
          case "b": out += "\b"; break;
          case "f": out += "\f"; break;
          case "/": out += "/"; break;
          case '"': out += '"'; break;
          case "\\": out += "\\"; break;
          case "u":
            out += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16));
            i += 4;
            break;
          default: out += next ?? "";
        }
        i += 2;
        continue;
      }
      if (c === '"') {
        i++;
        break;
      }
      out += c;
      i++;
    }
    return out;
  }

  function parseValue(path: string) {
    skipWs();
    const start = i;
    const c = text[i];
    if (c === "{") parseObject(path);
    else if (c === "[") parseArray(path);
    else if (c === '"') readString();
    else {
      // number / true / false / null — read until a delimiter.
      while (i < n && !isWs(text[i]) && text[i] !== "," && text[i] !== "}" && text[i] !== "]") {
        i++;
      }
    }
    map.set(path, { from: start, to: i });
  }

  function parseObject(path: string) {
    i++; // {
    skipWs();
    if (text[i] === "}") {
      i++;
      return;
    }
    while (i < n) {
      skipWs();
      if (text[i] !== '"') break;
      const key = readString();
      skipWs();
      if (text[i] === ":") i++;
      parseValue(childPath(path, key));
      skipWs();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "}") {
        i++;
        break;
      }
      break;
    }
  }

  function parseArray(path: string) {
    i++; // [
    skipWs();
    if (text[i] === "]") {
      i++;
      return;
    }
    let idx = 0;
    while (i < n) {
      parseValue(childPath(path, idx++));
      skipWs();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "]") {
        i++;
        break;
      }
      break;
    }
  }

  try {
    parseValue("$");
  } catch {
    /* return whatever we located */
  }
  return map;
}
