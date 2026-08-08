export type TagTone = "teal" | "amber" | "coral" | "blue" | "gray";
export type DueTone = "teal" | "amber" | "coral" | "neutral";

/** Maps tag tone → muted pill class (prefer class over inline color). */
export function tagClass(tone: TagTone): string {
  switch (tone) {
    case "teal":
      return "kb-tag kb-tag-teal";
    case "amber":
      return "kb-tag kb-tag-amber";
    case "coral":
      return "kb-tag kb-tag-coral";
    case "blue":
    default:
      return "kb-tag kb-tag-gray";
  }
}

/** @deprecated Prefer tagClass — kept for any remaining inline callers. */
export function tagStyle(tone: TagTone): React.CSSProperties {
  switch (tone) {
    case "teal":
      return { background: "#eef4ee", color: "#3d6b4a" };
    case "amber":
      return { background: "#f7f1e6", color: "#8a6a2f" };
    case "coral":
      return { background: "#f7ecec", color: "#9c4d47" };
    case "blue":
    default:
      return { background: "var(--color-muted)", color: "var(--color-ink2)" };
  }
}

export function dueColor(tone: DueTone): string {
  switch (tone) {
    case "coral":
      return "var(--color-coral)";
    case "amber":
      return "var(--color-amber)";
    case "teal":
      return "var(--color-teal)";
    default:
      return "var(--color-ink2)";
  }
}
