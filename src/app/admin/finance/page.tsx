import Link from "next/link";
import { getFinanceSummary } from "@/features/billing/actions/finance.actions";

export default async function FinancePage() {
  const result = await getFinanceSummary();
  const data = result.success ? result.data : undefined;

  if (!data) {
    return (
      <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm">
        {result.error ?? "The revenue figures could not be loaded."}
      </div>
    );
  }

  const money = (value: string) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: data.currencyCode }).format(
      Number(value),
    );

  const thisMonth = Number(data.receivedThisMonth);
  const lastMonth = Number(data.receivedLastMonth);
  // Only stated when there is a previous month to compare against. A change
  // from nothing is not a percentage.
  const change =
    lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">
          Revenue &amp; Folios
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
          Money actually received, and what is still owed. Figures come from posted charges and
          recorded payments — nothing is estimated.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card title="Received This Month" value={money(data.receivedThisMonth)}>
          {change === null ? (
            <span className="text-stone-500">No payments last month to compare with</span>
          ) : (
            <span className={change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}% vs the same point last month
            </span>
          )}
        </Card>

        <Card title="Open Folios" value={String(data.openInvoiceCount)}>
          <span className="text-stone-500">Bills not yet settled</span>
        </Card>

        <Card title="Outstanding" value={money(data.outstanding)}>
          <span className="text-stone-500">Charged but not paid</span>
        </Card>
      </div>

      <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="font-serif text-lg text-stone-900 dark:text-white">Recent Folios</h2>
        </header>

        {data.invoices.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-stone-500">
            No folios yet. One is raised the first time a charge is posted against a booking.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 dark:bg-stone-950 text-xs uppercase font-mono text-stone-500 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Guest</th>
                  <th className="px-6 py-3">Raised</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Charged</th>
                  <th className="px-6 py-3 text-right">Paid</th>
                  <th className="px-6 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {data.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-stone-50 dark:hover:bg-stone-950/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs font-semibold">
                      {invoice.reservationId ? (
                        <Link
                          href={`/admin/bookings/${invoice.reservationId}`}
                          className="text-stone-900 dark:text-stone-100 hover:text-emerald-500 transition-colors"
                        >
                          {invoice.reference}
                        </Link>
                      ) : (
                        <span className="text-stone-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-stone-900 dark:text-stone-100">{invoice.guestName}</td>
                    <td className="px-6 py-3 text-xs font-mono text-stone-500">
                      {invoice.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-mono font-semibold ${
                          invoice.status === "OPEN"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-stone-600 dark:text-stone-300">
                      {money(invoice.total)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-stone-600 dark:text-stone-300">
                      {money(invoice.paid)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono font-semibold ${
                        Number(invoice.balance) > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-stone-500"
                      }`}
                    >
                      {money(invoice.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
      <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {title}
      </h3>
      <div className="mt-4">
        <span className="text-4xl font-serif font-bold text-stone-900 dark:text-white tracking-tight">
          {value}
        </span>
      </div>
      <p className="mt-2 text-xs font-mono">{children}</p>
    </div>
  );
}
