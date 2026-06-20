"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

// --- Button ----------------------------------------------------------------

type Variant = "primary" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  active,
  title,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  className?: string;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none whitespace-nowrap";
  const variants: Record<Variant, string> = {
    primary: "bg-accent hover:bg-accent-hover text-white",
    ghost: `border border-border text-gray-300 hover:bg-bg-softer ${
      active ? "bg-bg-softer text-white" : "bg-bg-soft"
    }`,
    danger:
      "border border-red-300 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-900/60 dark:bg-bg-soft dark:text-red-300 dark:hover:bg-red-950/40",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// --- Switch (toggle) -------------------------------------------------------

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-300">
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onChange}
        className="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-bg-softer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg data-[state=checked]:bg-green-500"
      >
        <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
      </SwitchPrimitive.Root>
      {label}
    </label>
  );
}

// --- Select ----------------------------------------------------------------

export function Select({
  value,
  onChange,
  options,
  className = "",
  title,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  title?: string;
}) {
  return (
    <select
      title={title}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`cursor-pointer rounded-md border border-border bg-bg-soft px-2.5 py-1.5 text-sm text-gray-300 hover:bg-bg-softer focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// --- Status banner ---------------------------------------------------------

export function Banner({
  kind,
  children,
}: {
  kind: "ok" | "error" | "info";
  children: ReactNode;
}) {
  const styles = {
    ok: "border-green-800/60 bg-green-950/30 text-green-300",
    error: "border-red-800/60 bg-red-950/30 text-red-300",
    info: "border-border bg-bg-soft text-gray-300",
  };
  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${styles[kind]}`}
    >
      {children}
    </div>
  );
}

// --- Toast (confirmations & validation feedback) ---------------------------

type ToastKind = "ok" | "error" | "info";
interface ToastOpts {
  kind?: ToastKind;
  /** Milliseconds before auto-dismiss. Defaults: 1800ms, or 4500ms for errors. */
  duration?: number;
}
type ShowToast = (message: string, opts?: ToastOpts) => void;

const ToastCtx = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(
    null,
  );
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<ShowToast>((message, opts) => {
    const kind = opts?.kind ?? "info";
    setToast({ message, kind });
    window.clearTimeout(timer.current);
    const duration = opts?.duration ?? (kind === "error" ? 4500 : 1800);
    timer.current = window.setTimeout(() => setToast(null), duration);
  }, []);

  const styles: Record<ToastKind, string> = {
    ok: "border-green-700 bg-green-950 text-green-200",
    error: "border-red-700 bg-red-950 text-red-200",
    info: "border-border bg-bg-softer text-gray-100",
  };

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 cursor-pointer rounded-md border px-4 py-2 text-sm shadow-lg ${styles[toast.kind]}`}
          onClick={() => setToast(null)}
        >
          {toast.message}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
