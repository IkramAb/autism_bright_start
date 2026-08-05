export type TagTone = "teal" | "amber" | "coral" | "blue" | "gray";
export type DueTone = "teal" | "amber" | "coral" | "neutral";

export function tagStyle(tone: TagTone): React.CSSProperties {
  switch (tone) {
    case "teal":
      return { background: "var(--color-teal-light)", color: "var(--color-teal-dark)" };
    case "amber":
      return { background: "var(--color-amber-light)", color: "var(--color-amber-dark)" };
    case "coral":
      return { background: "var(--color-coral-light)", color: "var(--color-coral-dark)" };
    // Blue is brand, not status — collapse to neutral gray
    case "blue":
    default:
      return { background: "#eef1f5", color: "#5c6270" };
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
