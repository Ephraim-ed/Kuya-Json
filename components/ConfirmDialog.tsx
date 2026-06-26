"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./ui";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** localStorage key — when set, shows a "Don't ask again" checkbox. */
  dontAskKey?: string;
}

type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<ConfirmFn>(async () => true);

/** Returns an async `confirm(options)` that resolves to true/false. */
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [dontAsk, setDontAsk] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    if (o.dontAskKey && localStorage.getItem(o.dontAskKey) === "1") {
      return Promise.resolve(true);
    }
    setDontAsk(false);
    setOpts(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);

  const settle = useCallback(
    (result: boolean) => {
      if (result && dontAsk && opts?.dontAskKey) {
        try {
          localStorage.setItem(opts.dontAskKey, "1");
        } catch {
          /* ignore */
        }
      }
      resolver.current?.(result);
      resolver.current = null;
      setOpts(null);
    },
    [dontAsk, opts],
  );

  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
      else if (e.key === "Enter") settle(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, settle]);

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="animate-kuya-fade fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={() => settle(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="animate-kuya-pop w-full max-w-sm rounded-xl border border-border bg-bg-soft p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-100">{opts.title}</h2>
            {opts.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                {opts.description}
              </p>
            )}

            {opts.dontAskKey && (
              <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={dontAsk}
                  onChange={(e) => setDontAsk(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-accent"
                />
                Don&apos;t ask me again
              </label>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => settle(false)}>
                {opts.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={opts.danger ? "danger" : "primary"}
                onClick={() => settle(true)}
              >
                {opts.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
