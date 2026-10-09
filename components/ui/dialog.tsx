"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionTokens, springs } from "@/lib/motion-tokens";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal shell shared by every dialog: animated enter/exit, Escape to close,
 * focus moved in on open, Tab trapped inside, and focus restored on close.
 */
export function Dialog({
  open,
  onClose,
  label,
  role = "dialog",
  initialFocus,
  placement = "top",
  dim = true,
  zIndex = "z-50",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name announced by screen readers. */
  label: string;
  role?: "dialog" | "alertdialog";
  /** Element to focus on open; defaults to the first focusable control. */
  initialFocus?: RefObject<HTMLElement | null>;
  /**
   * "top" sits below the header like a command palette; "top-right" docks
   * beside the content (like an editor's find widget); "center" for
   * confirmations.
   */
  placement?: "top" | "top-right" | "center";
  /**
   * Dim the page behind the panel. When false the page stays visible and
   * scrollable underneath; clicking outside the panel still closes it.
   */
  dim?: boolean;
  zIndex?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <DialogBody
          key="dialog"
          onClose={onClose}
          label={label}
          role={role}
          initialFocus={initialFocus}
          placement={placement}
          dim={dim}
          zIndex={zIndex}
          className={className}
        >
          {children}
        </DialogBody>
      )}
    </AnimatePresence>
  );
}

function DialogBody({
  onClose,
  label,
  role,
  initialFocus,
  placement,
  dim,
  zIndex,
  className,
  children,
}: {
  onClose: () => void;
  label: string;
  role: "dialog" | "alertdialog";
  initialFocus?: RefObject<HTMLElement | null>;
  placement: "top" | "top-right" | "center";
  dim: boolean;
  zIndex: string;
  className?: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus in on open, back to the trigger on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const target =
      initialFocus?.current ??
      panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (target ?? panel.current)?.focus();
    return () => {
      // Only restore if focus is still on the closing dialog (or lost),
      // so an action that moved focus elsewhere keeps it.
      const active = document.activeElement;
      if (
        !active ||
        active === document.body ||
        panel.current?.contains(active)
      ) {
        previous?.focus?.();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes; Tab cycles within the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(
        panel.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (active === last || !panel.current.contains(active))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Undimmed: there's no backdrop to click, so close on any press outside.
  useEffect(() => {
    if (dim) return;
    const onDown = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node)) onCloseRef.current();
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [dim]);

  const offset = reduce ? 0 : -motionTokens.distance.sm;
  const scale = reduce ? 1 : motionTokens.scale.subtle;

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex p-4 ${
        placement === "center"
          ? "items-center justify-center"
          : placement === "top-right"
            ? "items-start justify-center pt-[8vh] sm:justify-end sm:pr-6"
            : "items-start justify-center pt-[8vh]"
      } ${dim ? "" : "pointer-events-none"}`}
    >
      {dim && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: motionTokens.duration.fast,
            ease: motionTokens.easing.smooth,
          }}
          onClick={onClose}
        />
      )}
      <motion.div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`pointer-events-auto relative outline-none ${className ?? ""}`}
        initial={{ opacity: 0, y: offset, scale }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{
          opacity: 0,
          y: offset,
          scale,
          transition: {
            duration: motionTokens.duration.fast,
            ease: motionTokens.easing.sharp,
          },
        }}
        transition={springs.snappy}
      >
        {children}
      </motion.div>
    </div>
  );
}
