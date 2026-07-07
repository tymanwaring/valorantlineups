"use client";

export default function NavArrow({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = dir === "prev";
  const chevron = (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={isPrev ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
    </svg>
  );
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={isPrev ? "Previous lineup" : "Next lineup"}
      title={isPrev ? "Previous lineup (↑)" : "Next lineup (↓)"}
      className="flex shrink-0 items-center gap-2 rounded-full border border-panel-border/70 bg-panel/85 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70 shadow-lg backdrop-blur-md transition hover:border-accent hover:bg-panel hover:text-accent"
    >
      {isPrev && chevron}
      <span>{isPrev ? "Previous lineup" : "Next lineup"}</span>
      {!isPrev && chevron}
    </button>
  );
}
