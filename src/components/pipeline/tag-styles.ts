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
    case "blue":
      return { background: "var(--color-blue-light)", color: "var(--color-blue-dark)" };
    default:
      return { background: "#f1efe8", color: "var(--color-ink2)" };
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
