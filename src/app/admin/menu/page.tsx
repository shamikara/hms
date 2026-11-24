import { loadMenuBoard } from "@/features/menu/actions/menu.actions";
import { MenuBoard } from "@/features/menu/components/MenuBoard";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const result = await loadMenuBoard(date);
  return <MenuBoard data={result.success && result.data ? result.data : null} loadError={result.success ? undefined : result.error} />;
}
