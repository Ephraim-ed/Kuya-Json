"use client";

import { useMemo, useState } from "react";
import Split from "../Split";
import { VenetianMask, Info, ShieldCheck } from "lucide-react";
import { Banner, Button, Select } from "../ui";
import Tooltip from "../Tooltip";
import { useConsole } from "../console";
import { type ToolProps } from "./types";
import { runAnonymize } from "@/lib/workers/client";
import { validate } from "@/lib/json/validate";
import {
  detectPii,
  rulesFromDetected,
  anonymizeAllValues,
  PII_LABELS,
  type AnonRule,
  type DetectedPii,
  type MatchType,
  type Strategy,
} from "@/lib/json/anonymize";

let ruleSeq = 0;
function newRule(strategy: Strategy = "fake"): AnonRule {
  return { id: `r${ruleSeq++}`, match: "key", pattern: "", strategy, enabled: true };
}

const STRATEGY_OPTIONS = [
  { value: "fake", label: "Fake (realistic)" },
  { value: "mask", label: "Mask (a***z)" },
  { value: "redact", label: "Redact (***)" },
  { value: "hash", label: "Hash (stable)" },
];

export default function AnonymizeTool({ input, setInput, editor }: ToolProps) {
  const [rules, setRules] = useState<AnonRule[]>([]);
  const [count, setCount] = useState<number | null>(null);
  // Global strategy applied to every rule / selected key.
  const [allStrategy, setAllStrategy] = useState<Strategy>("fake");
  const { push, clearSource } = useConsole();

  // Set the anonymization type for all selected keys at once.
  function applyStrategyToAll(strategy: Strategy) {
    setAllStrategy(strategy);
    setRules((rs) => rs.map((r) => ({ ...r, strategy })));
  }

  const detected: DetectedPii[] = useMemo(() => {
    const v = validate(input);
    return v.ok ? detectPii(v.value) : [];
  }, [input]);

  async function run(activeRules: AnonRule[]) {
    clearSource("anonymize");
    const v = validate(input);
    if (!v.ok) {
      push("error", v.error.message, "anonymize");
      return;
    }
    const r = await runAnonymize(input, activeRules);
    setInput(r.text); // apply in place
    setCount(r.count);
    push("ok", `Anonymized ${r.count} value${r.count === 1 ? "" : "s"}`, "anonymize");
  }

  function anonymizeAllPii() {
    const autoRules = rulesFromDetected(detected).map((r) => ({
      ...r,
      strategy: allStrategy,
    }));
    setRules(autoRules);
    run(autoRules);
  }

  function anonymizeEverything() {
    clearSource("anonymize");
    const v = validate(input);
    if (!v.ok) {
      push("error", v.error.message, "anonymize");
      return;
    }
    const r = anonymizeAllValues(v.value);
    setInput(JSON.stringify(r.value, null, 2));
    setCount(r.count);
    push("ok", `Anonymized ${r.count} value${r.count === 1 ? "" : "s"}`, "anonymize");
  }

  const updateRule = (id: string, patch: Partial<AnonRule>) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRule = (id: string) => setRules((rs) => rs.filter((r) => r.id !== id));

  const detectedSection = (
    <div className="flex h-full min-h-0 flex-col p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
          Detected PII ({detected.length})
          <Tooltip text="PII = Personally Identifiable Information — data that can identify someone (emails, phone numbers, SSNs, credit cards, IPs, names, addresses). Kuya auto-detects these so you can mask them.">
            <Info size={12} className="cursor-help text-gray-500 hover:text-gray-300" />
          </Tooltip>
        </span>
        <Button disabled={detected.length === 0} onClick={anonymizeAllPii}>
          <ShieldCheck size={15} />
          Anonymize PII
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-auto">
        {detected.length === 0 ? (
          <p className="text-xs text-gray-600">No PII detected.</p>
        ) : (
          detected.map((d, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded bg-bg px-2 py-1 text-xs"
            >
              <span className="rounded bg-bg-softer px-1.5 py-0.5 text-[10px] uppercase text-accent">
                {PII_LABELS[d.kind]}
              </span>
              <span className="truncate text-gray-400" title={d.displayPath}>
                {d.displayPath}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const rulesList = (
    <div className="h-full space-y-2 overflow-auto p-2">
      <div className="flex items-center gap-2 rounded border border-border bg-bg px-2 py-1.5">
        <span className="shrink-0 text-xs font-medium text-gray-400">All keys:</span>
        <Select
          className="flex-1"
          value={allStrategy}
          onChange={(v) => applyStrategyToAll(v as Strategy)}
          options={STRATEGY_OPTIONS}
        />
      </div>
      {rules.length === 0 && (
        <p className="text-xs text-gray-600">
          Add a rule, or use “Anonymize PII” to mask detected PII.
        </p>
      )}
      {rules.map((r) => (
          <div key={r.id} className="space-y-1.5 rounded border border-border p-2">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => updateRule(r.id, { enabled: e.target.checked })}
              />
              <Select
                className="flex-1"
                value={r.match}
                onChange={(v) => updateRule(r.id, { match: v as MatchType })}
                options={[
                  { value: "key", label: "Key (exact)" },
                  { value: "keyGlob", label: "Key (glob)" },
                  { value: "keyRegex", label: "Key (regex)" },
                  { value: "jsonpath", label: "JSONPath" },
                ]}
              />
              <button
                onClick={() => removeRule(r.id)}
                className="px-1 text-gray-500 hover:text-red-300"
                title="Remove rule"
              >
                ✕
              </button>
            </div>
            <input
              value={r.pattern}
              onChange={(e) => updateRule(r.id, { pattern: e.target.value })}
              placeholder={r.match === "jsonpath" ? "$..email" : "email / user* / .*Name"}
              className="w-full rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Select
              className="w-full"
              value={r.strategy}
              onChange={(v) => updateRule(r.id, { strategy: v as Strategy })}
              options={STRATEGY_OPTIONS}
            />
          </div>
        ))}
    </div>
  );

  const rulesPanel = (
    <div className="flex h-full min-h-0 flex-col border-l border-border bg-bg-soft">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Rules
        </span>
        <Button
          variant="primary"
          className="ml-auto"
          onClick={() => run(rules)}
          disabled={rules.length === 0}
          title="Apply the rules below to the document"
        >
          Anonymize
        </Button>
        <Button onClick={() => setRules((rs) => [...rs, newRule(allStrategy)])}>
          + Rule
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <Split
          direction="vertical"
          initial={0.4}
          storageKey="anon-detected"
          first={detectedSection}
          second={rulesList}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
        <Button
          onClick={anonymizeEverything}
          title="Replace every value with a fake of the same type (strings, numbers, booleans), keeping structure & types"
        >
          <VenetianMask size={15} />
          Anonymize all values
        </Button>
        {count != null && (
          <span className="text-xs text-gray-500">{count} values replaced (applied to document)</span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <Split
          direction="horizontal"
          initial={0.62}
          storageKey="anon-rules"
          first={editor}
          second={rulesPanel}
        />
      </div>
    </div>
  );
}
