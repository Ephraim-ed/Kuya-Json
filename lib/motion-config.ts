import { motionTokens } from "./motion-tokens";

/** Runtime gates for animation. Safe to call during SSR (returns conservative values). */
export const motionConfig = {
  isLowEnd() {
    return (
      typeof navigator !== "undefined" && navigator.hardwareConcurrency <= 4
    );
  },

  prefersReduced() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  },

  shouldAnimate({ essential = false } = {}) {
    if (this.prefersReduced()) return false;
    if (!essential && this.isLowEnd()) return false;
    return true;
  },

  duration() {
    return this.isLowEnd() || this.prefersReduced()
      ? motionTokens.duration.instant
      : motionTokens.duration.normal;
  },
};
