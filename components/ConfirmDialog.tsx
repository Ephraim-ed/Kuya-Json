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
import { Dialog } from "./ui/dialog";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** localStorage key — when set, shows a "Don't ask again" checkbox. */
  dontAskKey?: string;
  /** A value-returning checkbox (e.g. "include contents"); its state is in `checked`. */
  checkboxLabel?: ReactNode;
}

interface ConfirmResult {
  confirmed: boolean;
  /** State of the option checkbox (don't-ask or custom). */
  checked: boolean;
}

type ConfirmFn = (o: ConfirmOptions) => Promise<ConfirmResult>;

const Ctx = createContext<ConfirmFn>(async () => ({
  confirmed: true,
  checked: false,
}));

/** Returns an async `confirm(options)` resolving to `{ confirmed, checked }`. */
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [checked, setChecked] = useState(false);
  const resolver = useRef<((v: ConfirmResult) => void) | null>(null);
  // Last options shown, so the dialog keeps its content while animating out.
  const shown = useRef<ConfirmOptions | null>(null);
  if (opts) shown.current = opts;
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    if (o.dontAskKey && localStorage.getItem(o.dontAskKey) === "1") {
      return Promise.resolve({ confirmed: true, checked: false });
    }
    setChecked(false);
    setOpts(o);
    return new Promise<ConfirmResult>((res) => {
      resolver.current = res;
    });
  }, []);

  const settle = useCallback(
    (confirmed: boolean) => {
      if (confirmed && checked && opts?.dontAskKey) {
        try {
          localStorage.setItem(opts.dontAskKey, "1");
        } catch {
          /* ignore */
        }
      }
      resolver.current?.({ confirmed, checked });
      resolver.current = null;
      setOpts(null);
    },
    [checked, opts],
  );

  useEffect(() => {
    if (!opts) return;
    // Enter confirms, unless a button has focus — then that button's own
    // click decides (so Enter on Cancel cancels). Escape is handled by Dialog.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        settle(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, settle]);

  const o = shown.current;

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog
        open={opts !== null}
        onClose={() => settle(false)}
        label={o?.title ?? "Confirm"}
        role="alertdialog"
        placement="center"
        zIndex="z-[80]"
        initialFocus={o?.danger ? cancelBtn : confirmBtn}
        className="w-full max-w-sm rounded-xl border border-border bg-bg-soft p-5 shadow-2xl"
      >
        {o && (
          <>
            <h2 className="text-base font-semibold text-gray-100">{o.title}</h2>
            {o.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                {o.description}
              </p>
            )}

            {(o.dontAskKey || o.checkboxLabel) && (
              <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-accent"
                />
                {o.checkboxLabel ?? "Don't ask me again"}
              </label>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button ref={cancelBtn} onClick={() => settle(false)}>
                {o.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                ref={confirmBtn}
                variant={o.danger ? "danger" : "primary"}
                onClick={() => settle(true)}
              >
                {o.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </Ctx.Provider>
  );
}
