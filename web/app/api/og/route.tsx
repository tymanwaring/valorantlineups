import { ImageResponse } from "next/og";
import { getLineup } from "@/lib/store";
import { getAgent } from "@/lib/agents";
import { getMap } from "@/lib/maps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Social preview (OpenGraph/Twitter) image for a shared lineup link. A clean
// text "overview" card (map/side/site, title, agent) rendered at 1200x630 so it
// unfurls cleanly in Discord, iMessage, etc.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const id = searchParams.get("lineup");

  const lineup = id ? await getLineup(id) : undefined;
  const agent = lineup ? getAgent(lineup.agentSlug) : undefined;
  const map = lineup ? getMap(lineup.mapSlug) : undefined;

  const title = lineup?.title ?? "Valorant Lineups";
  const mapName = map?.name ?? "";
  const agentName = agent?.name ?? lineup?.agentSlug ?? "";
  const ability = lineup?.ability ?? "";
  const side = lineup?.side ?? "";
  const site = lineup?.site
    ? lineup.site === "Mid"
      ? "Mid"
      : `${lineup.site} Site`
    : "";
  const iconUrl = agent ? `${origin}${agent.icon}` : "";

  const eyebrow = [mapName, side, site].filter(Boolean).join("  •  ");
  const sub = [agentName, ability].filter(Boolean).join("  •  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f1115",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#ff4655",
            fontWeight: 700,
          }}
        >
          {eyebrow || "brimmybuddy"}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              width={220}
              height={220}
              style={{
                width: 220,
                height: 220,
                borderRadius: 24,
                border: "4px solid #ff4655",
                objectFit: "cover",
              }}
              alt=""
            />
          ) : null}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 68,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.05,
              }}
            >
              {title}
            </div>
            {sub ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 20,
                  fontSize: 34,
                  color: "#9ca3af",
                }}
              >
                {sub}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 3,
          }}
        >
          <span style={{ color: "#ff4655" }}>brimmy</span>
          <span style={{ color: "#ffffff" }}>buddy</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
