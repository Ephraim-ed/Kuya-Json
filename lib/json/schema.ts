import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} from "quicktype-core";
import { stripComments } from "./comments";

export interface SchemaValidationResult {
  ok: boolean;
  valid: boolean;
  errors: string[];
  /** Set when the schema or data could not be parsed. */
  fatal?: string;
}

/** Validate a JSON document against a JSON Schema (draft 2020-12). */
export function validateAgainstSchema(
  dataText: string,
  schemaText: string,
): SchemaValidationResult {
  let schema: object;
  let data: unknown;
  try {
    schema = JSON.parse(stripComments(schemaText));
  } catch {
    return { ok: false, valid: false, errors: [], fatal: "Schema is not valid JSON." };
  }
  try {
    data = JSON.parse(stripComments(dataText));
  } catch {
    return { ok: false, valid: false, errors: [], fatal: "Document is not valid JSON." };
  }

  try {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validateFn = ajv.compile(schema);
    const valid = validateFn(data);
    const errors =
      validateFn.errors?.map(
        (e) => `${e.instancePath || "(root)"} ${e.message ?? "is invalid"}`,
      ) ?? [];
    return { ok: true, valid, errors };
  } catch (e) {
    return {
      ok: false,
      valid: false,
      errors: [],
      fatal: e instanceof Error ? e.message : "Could not compile the schema.",
    };
  }
}

/** Generate a JSON Schema from a sample document. */
export async function generateSchema(jsonText: string): Promise<string> {
  const jsonInput = jsonInputForTargetLanguage("schema");
  await jsonInput.addSource({ name: "Root", samples: [jsonText] });
  const inputData = new InputData();
  inputData.addInput(jsonInput);
  const result = await quicktype({ inputData, lang: "schema" });
  return result.lines.join("\n");
}
