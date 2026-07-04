import { getLineups } from "@/lib/store";
import FavoritesClient from "./FavoritesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Favorites • brimmybuddy",
};

export default async function FavoritesPage() {
  const lineups = await getLineups();
  return <FavoritesClient lineups={lineups} />;
}
