import { listEnquiries } from "@/features/enquiries/actions/enquiry.actions";
import { getAdminActor, type AdminPermission } from "@/features/admin/lib/requireAdminSession";
import { EnquiriesBoard } from "@/features/enquiries/components/EnquiriesBoard";

export default async function EnquiriesPage() {
  const [result, actor] = await Promise.all([listEnquiries(), getAdminActor()]);
  const can = (p: AdminPermission) => actor?.permissions.includes(p) ?? false;
  return (
    <EnquiriesBoard
      enquiries={result.success && result.data ? result.data : []}
      loadError={result.success ? undefined : result.error}
      canManage={can("enquiries:manage")}
      canDelete={can("enquiries:delete")}
    />
  );
}
