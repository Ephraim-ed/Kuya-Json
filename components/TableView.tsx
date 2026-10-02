"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, ChevronUp, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type Selected = Record<number, Set<string> | undefined>;
type Sort = { col: number; dir: "asc" | "desc" } | null;

const DEFAULT_W = 150;
const MIN_W = 60;

export default function TableView({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  const [selected, setSelected] = useState<Selected>({});
  const [sort, setSort] = useState<Sort>(null);
  const [widths, setWidths] = useState<Record<number, number>>({});
  const resizing = useRef<{ col: number; startX: number; startW: number } | null>(
    null,
  );

  // Reset state when a new table (different columns) is shown.
  useEffect(() => {
    setSelected({});
    setSort(null);
    setWidths({});
  }, [headers]);

  const distinct = useMemo(
    () =>
      headers.map((_, ci) => {
        const set = new Set<string>();
        for (const r of rows) set.add(r[ci] ?? "");
        return Array.from(set).sort((a, b) => a.localeCompare(b));
      }),
    [headers, rows],
  );

  const filtered = useMemo(() => {
    const active = Object.entries(selected).filter(
      ([, s]) => s !== undefined,
    ) as [string, Set<string>][];
    if (active.length === 0) return rows;
    return active.reduce(
      (acc, [i, s]) => acc.filter((r) => s.has(r[Number(i)] ?? "")),
      rows,
    );
  }, [rows, selected]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { col, dir } = sort;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[col] ?? "";
      const bv = b[col] ?? "";
      const an = Number(av);
      const bn = Number(bv);
      const numeric = av !== "" && bv !== "" && !isNaN(an) && !isNaN(bn);
      const cmp = numeric ? an - bn : av.localeCompare(bv);
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort]);

  const anyActive = Object.values(selected).some((s) => s !== undefined);
  const total = headers.reduce((s, _, i) => s + (widths[i] ?? DEFAULT_W), 0);

  const setCol = (ci: number, s: Set<string> | undefined) =>
    setSelected((prev) => ({ ...prev, [ci]: s }));

  function toggleSort(i: number) {
    setSort((s) =>
      s?.col === i
        ? s.dir === "asc"
          ? { col: i, dir: "desc" }
          : null
        : { col: i, dir: "asc" },
    );
  }

  // --- column resizing ---
  const onMove = useCallback((e: MouseEvent) => {
    const r = resizing.current;
    if (!r) return;
    const w = Math.max(MIN_W, r.startW + (e.clientX - r.startX));
    setWidths((prev) => ({ ...prev, [r.col]: w }));
  }, []);
  const onUp = useCallback(() => {
    resizing.current = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }, [onMove]);
  function startResize(e: React.MouseEvent, i: number) {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { col: i, startX: e.clientX, startW: widths[i] ?? DEFAULT_W };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div className="pt-1">
      <div className="mb-1 flex items-center gap-2 text-gray-500">
        <span>
          {sorted.length}/{rows.length} rows
        </span>
        {(anyActive || sort) && (
          <button
            onClick={() => {
              setSelected({});
              setSort(null);
            }}
            className="text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline"
          >
            reset
          </button>
        )}
      </div>

      <div className="rounded-md border border-border">
        <Table className="table-fixed" style={{ width: total, minWidth: "100%" }}>
          <colgroup>
            {headers.map((_, i) => (
              <col key={i} style={{ width: widths[i] ?? DEFAULT_W }} />
            ))}
          </colgroup>
          <TableHeader className="sticky top-0 z-10 bg-bg-soft">
            <TableRow className="hover:bg-transparent">
              {headers.map((h, i) => (
                <TableHead
                  key={i}
                  className={`relative align-middle ${
                    i < headers.length - 1 ? "border-r border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleSort(i)}
                      title="Sort by this column"
                      className="flex min-w-0 flex-1 items-center gap-1 text-gray-200 hover:text-white"
                    >
                      <span className="truncate">{h || " "}</span>
                      {sort?.col === i &&
                        (sort.dir === "asc" ? (
                          <ChevronUp size={12} className="shrink-0 text-accent-fg" />
                        ) : (
                          <ChevronDown size={12} className="shrink-0 text-accent-fg" />
                        ))}
                    </button>
                    <ColumnFilter
                      values={distinct[i]}
                      selected={selected[i]}
                      onChange={(s) => setCol(i, s)}
                    />
                  </div>
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => startResize(e, i)}
                    className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-accent"
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r, ri) => (
              <TableRow key={ri}>
                {headers.map((_, ci) => (
                  <TableCell
                    key={ci}
                    className={`truncate ${
                      ci < headers.length - 1 ? "border-r border-border" : ""
                    }`}
                    title={r[ci] ?? ""}
                  >
                    {r[ci] ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={headers.length}
                  className="py-3 text-center text-gray-600"
                >
                  No rows match the filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ColumnFilter({
  values,
  selected,
  onChange,
}: {
  values: string[];
  selected: Set<string> | undefined;
  onChange: (s: Set<string> | undefined) => void;
}) {
  const [q, setQ] = useState("");
  const active = selected !== undefined;

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return values;
    return values.filter((v) => v.toLowerCase().includes(term));
  }, [q, values]);

  const isChecked = (v: string) => (selected === undefined ? true : selected.has(v));

  function toggle(v: string) {
    const base = new Set(selected ?? values);
    if (base.has(v)) base.delete(v);
    else base.add(v);
    onChange(base.size === values.length ? undefined : base);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          title="Filter column"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-bg-softer ${
            active ? "text-accent-fg" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <MoreVertical size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search values…"
          className="w-full rounded border border-border bg-bg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="mt-1.5 flex items-center justify-between text-2xs">
          <button
            onClick={() => onChange(undefined)}
            className="text-gray-500 hover:text-gray-200"
          >
            Select all
          </button>
          <button
            onClick={() => onChange(new Set())}
            className="text-gray-500 hover:text-gray-200"
          >
            Clear
          </button>
        </div>
        <div className="mt-1.5 max-h-52 overflow-auto">
          {shown.length === 0 ? (
            <p className="px-1 py-1 text-xs text-gray-600">No values.</p>
          ) : (
            shown.map((v, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-bg-softer"
              >
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={isChecked(v)}
                  onChange={() => toggle(v)}
                />
                <span className="truncate text-gray-300" title={v}>
                  {v === "" ? "(empty)" : v}
                </span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
