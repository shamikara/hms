import { getAdminActor } from "@/features/admin/lib/requireAdminSession";
import { ReportsBoard } from "@/features/reports/components/ReportsBoard";

export default async function ReportsPage() {
  const actor = await getAdminActor();
  return <ReportsBoard canFinance={actor?.permissions.includes("finance:view") ?? false} />;
}
