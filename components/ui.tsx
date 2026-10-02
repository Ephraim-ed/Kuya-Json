"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { useSafeMotion } from "@/hooks/use-reduced-motion";
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
  ref,
}: {
  ref?: Ref<HTMLButtonElement>;
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
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 select-none whitespace-nowrap";
  const variants: Record<Variant, string> = {
    primary: "bg-accent hover:bg-accent-hover text-white",
    ghost: `border border-border text-gray-300 hover:bg-bg-softer ${
      active ? "bg-bg-softer text-gray-100" : "bg-bg-soft"
    }`,
    danger:
      "border border-red-300 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-900/60 dark:bg-bg-soft dark:text-red-300 dark:hover:bg-red-950/40",
  };
  return (
    <button
      ref={ref}
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
    ok: "border-success-border bg-success-bg text-success",
    error: "border-danger-border bg-danger-bg text-danger",
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
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    kind: ToastKind;
    duration: number;
  } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(0);
  const safe = useSafeMotion(motionTokens.distance.md);

  const show = useCallback<ShowToast>((message, opts) => {
    const kind = opts?.kind ?? "info";
    const duration = opts?.duration ?? (kind === "error" ? 4500 : 1800);
    setToast({ id: ++nextId.current, message, kind, duration });
  }, []);

  // Auto-dismiss; hovering pauses the countdown so the message can be read.
  const startTimer = useCallback((ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => {
    if (toast) startTimer(toast.duration);
    return () => window.clearTimeout(timer.current);
  }, [toast, startTimer]);

  const styles: Record<ToastKind, string> = {
    ok: "border-success-border bg-success-bg text-success",
    error: "border-danger-border bg-danger-bg text-danger",
    info: "border-border bg-bg-softer text-gray-100",
  };

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
      >
        <AnimatePresence mode="wait">
          {toast && (
            <motion.div
              key={toast.id}
              role={toast.kind === "error" ? "alert" : undefined}
              initial={safe.initial}
              animate={safe.animate}
              exit={{
                ...safe.initial,
                transition: {
                  duration: motionTokens.duration.fast,
                  ease: motionTokens.easing.sharp,
                },
              }}
              transition={springs.snappy}
              className={`pointer-events-auto max-w-[90vw] cursor-pointer rounded-md border px-4 py-2 text-sm shadow-lg ${styles[toast.kind]}`}
              onClick={() => setToast(null)}
              onMouseEnter={() => window.clearTimeout(timer.current)}
              onMouseLeave={() => startTimer(1200)}
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
