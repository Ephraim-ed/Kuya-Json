import yaml from "js-yaml";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { json2csv, csv2json } from "json-2-csv";
import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} from "quicktype-core";
import { stripComments } from "./comments";

export type CodeTarget =
  | "typescript"
  | "python"
  | "pydantic"
  | "go"
  | "schema";

export type ConvertTarget = "yaml" | "xml" | "csv" | CodeTarget;

// --- structured formats ----------------------------------------------------

export function toYaml(value: unknown): string {
  return yaml.dump(value, { indent: 2, lineWidth: 100, noRefs: true });
}

export function fromYaml(text: string): unknown {
  return yaml.load(text);
}

const xmlBuilder = new XMLBuilder({
  format: true,
  indentBy: "  ",
  ignoreAttributes: false,
});
const xmlParser = new XMLParser({ ignoreAttributes: false });

export function toXml(value: unknown): string {
  // Wrap arrays / primitives so there is always a single root element.
  const rooted =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : { root: value };
  return xmlBuilder.build(rooted);
}

export function fromXml(text: string): unknown {
  return xmlParser.parse(text);
}

export async function toCsv(value: unknown, unwind = false): Promise<string> {
  const rows = Array.isArray(value) ? value : [value];
  return json2csv(rows as Record<string, unknown>[], {
    expandNestedObjects: true,
    expandArrayObjects: true,
    // Unwind: emit a separate row for each element of an array field.
    unwindArrays: unwind,
  });
}

export async function fromCsv(text: string): Promise<unknown> {
  return csv2json(text);
}

// --- code generation via quicktype ----------------------------------------

const TARGET_LANG = {
  typescript: "typescript",
  python: "python",
  pydantic: "python",
  go: "go",
  schema: "schema",
} as const;

export async function toCode(
  jsonText: string,
  target: CodeTarget,
  topLevelName = "Root",
): Promise<string> {
  const lang = TARGET_LANG[target];
  const jsonInput = jsonInputForTargetLanguage(lang);
  await jsonInput.addSource({ name: topLevelName, samples: [jsonText] });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const rendererOptions: Record<string, string> = {};
  if (target === "typescript") {
    rendererOptions["just-types"] = "true";
  } else if (target === "python") {
    rendererOptions["python-version"] = "3.7";
  } else if (target === "pydantic") {
    rendererOptions["pydantic-base-model"] = "true";
  }

  const result = await quicktype({
    inputData,
    lang,
    rendererOptions,
  });
  return result.lines.join("\n");
}

// --- unified entry point ---------------------------------------------------

export async function convert(
  jsonText: string,
  target: ConvertTarget,
): Promise<string> {
  const value = JSON.parse(stripComments(jsonText));
  switch (target) {
    case "yaml":
      return toYaml(value);
    case "xml":
      return toXml(value);
    case "csv":
      return toCsv(value);
    case "typescript":
    case "python":
    case "pydantic":
    case "go":
    case "schema":
      return toCode(jsonText, target);
    default:
      throw new Error(`Unsupported target: ${target}`);
  }
}
