import { getFinanceSummary, getInHouseGuests } from "@/features/billing/actions/finance.actions";
import { ChargeToRoom } from "@/features/billing/components/ChargeToRoom";

export default async function RestaurantPage() {
  const [guestsResult, summary] = await Promise.all([getInHouseGuests(), getFinanceSummary()]);

  return (
    <ChargeToRoom
      guests={guestsResult.success && guestsResult.data ? guestsResult.data : []}
      currencyCode={summary.success && summary.data ? summary.data.currencyCode : "USD"}
      loadError={guestsResult.success ? undefined : guestsResult.error}
    />
  );
}
