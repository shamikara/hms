import { getSiteSettings } from "@/features/site/actions/site.actions";
import { SettingsBoard } from "@/features/site/components/SettingsBoard";
import { getPaymentSettings } from "@/features/payments/actions/payment-admin.actions";
import { PaymentSettingsCard } from "@/features/payments/components/PaymentSettingsCard";

export default async function SettingsPage() {
  const [result, payments] = await Promise.all([getSiteSettings(), getPaymentSettings()]);
  return (
    <div className="space-y-6">
      <SettingsBoard
        settings={result.success && result.data ? result.data : null}
        loadError={result.success ? undefined : result.error}
      />
      <PaymentSettingsCard
        settings={payments.success && payments.data ? payments.data : null}
        loadError={payments.success ? undefined : payments.error}
      />
    </div>
  );
}
