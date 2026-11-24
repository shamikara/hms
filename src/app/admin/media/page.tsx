import { loadMediaBoard } from "@/features/media/actions/media.actions";
import { MediaBoard } from "@/features/media/components/MediaBoard";

export default async function MediaPage() {
  const result = await loadMediaBoard();
  return <MediaBoard data={result.success && result.data ? result.data : null} loadError={result.success ? undefined : result.error} />;
}
