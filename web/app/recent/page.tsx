import { getLineups } from "@/lib/store";
import RecentClient from "./RecentClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recently viewed • brimmybuddy",
};

export default async function RecentPage() {
  const lineups = await getLineups();
  return <RecentClient lineups={lineups} />;
}
