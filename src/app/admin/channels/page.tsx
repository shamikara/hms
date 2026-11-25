import { AlertTriangle } from "lucide-react";
import { getAdminActor } from "@/features/admin/lib/requireAdminSession";
import { loadChannelBoard } from "@/features/channels/actions/channel.actions";
import { ChannelBoard } from "@/features/channels/components/ChannelBoard";
import { SITE_URL } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const [result, actor] = await Promise.all([loadChannelBoard(), getAdminActor()]);
  if (!result.success || !result.data) {
    return (
      <div className="p-6 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> {result.error ?? "Could not load channel sync."}
      </div>
    );
  }
  return <ChannelBoard data={result.data} canManage={actor?.permissions.includes("rooms:manage") ?? false} origin={SITE_URL} />;
}
