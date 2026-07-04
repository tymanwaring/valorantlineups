"use client";

import { useFavorites } from "@/lib/favorites";

// A star toggle for bookmarking a lineup to the local "my go-tos" list.
export default function FavoriteStar({
  id,
  className = "",
  size = "md",
}: {
  id: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(id);
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      title={active ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggle(id);
      }}
      className={`flex ${dim} items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${icon} transition ${active ? "text-yellow-400" : "text-white/80"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
    </button>
  );
}
