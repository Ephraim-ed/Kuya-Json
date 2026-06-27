/** Color palette for tab-group folders. */
export const FOLDER_COLORS = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#22c55e", // green
  "#ef4444", // red
  "#a855f7", // purple
  "#ec4899", // pink
  "#94a3b8", // gray
];

export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[0];

/** Pick a color not already used by `existing`; falls back to cycling. */
export function nextFolderColor(existing: (string | undefined)[]): string {
  const used = new Set(existing.filter(Boolean));
  return (
    FOLDER_COLORS.find((c) => !used.has(c)) ??
    FOLDER_COLORS[existing.length % FOLDER_COLORS.length]
  );
}
