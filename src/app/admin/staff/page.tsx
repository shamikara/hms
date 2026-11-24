import { listStaff } from "@/features/staff/actions/staff.actions";
import { getAdminActor } from "@/features/admin/lib/requireAdminSession";
import { StaffBoard } from "@/features/staff/components/StaffBoard";

export default async function StaffPage() {
  const [result, actor] = await Promise.all([listStaff(), getAdminActor()]);

  return (
    <StaffBoard
      staff={result.success && result.data ? result.data : null}
      loadError={result.success ? undefined : result.error}
      canGrantSuperAdmin={actor?.roles.includes("SUPER_ADMIN") ?? false}
    />
  );
}
