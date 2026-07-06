"use client";

import { usePathname, useRouter } from "next/navigation";

// Header "+ Add Lineup" button. When on a map page, it forwards the map/side/
// agent the user is currently viewing (stashed in sessionStorage by MapClient)
// so the Add form can prefill them.
export default function AddLineupButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function go() {
    // Remember where we were so the Add form can return here after saving.
    try {
      sessionStorage.setItem(
        "addLineupReturnTo",
        window.location.pathname + window.location.search,
      );
    } catch {
      // Storage unavailable — non-critical.
    }

    let href = "/admin";
    if (pathname?.startsWith("/maps/")) {
      try {
        const raw = sessionStorage.getItem("addLineupContext");
        const ctx = raw ? JSON.parse(raw) : null;
        if (ctx?.map && pathname.includes(ctx.map)) {
          const q = new URLSearchParams();
          q.set("map", ctx.map);
          if (ctx.side) q.set("side", ctx.side);
          if (ctx.agent && ctx.agent !== "all") q.set("agent", ctx.agent);
          href = `/admin?${q.toString()}`;
        }
      } catch {
        // Ignore malformed context; fall back to a blank form.
      }
    }
    router.push(href);
  }

  return (
    <button type="button" onClick={go} className={className}>
      + Add Lineup
    </button>
  );
}
