import prisma from "@/core/db/prisma";

export default async function FinancePage() {
  const recentInvoices: any[] = [];
  const totalRevenue = 0;
  const pendingRevenue = 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Financial Overview</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Manage invoices, payments, and financial reporting.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">Total Cleared Revenue</h3>
          <div className="mt-4">
            <span className="text-4xl font-serif text-stone-900 dark:text-white tracking-tight">${totalRevenue.toFixed(2)}</span>
          </div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">From recent invoices</p>
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">Open Invoices</h3>
          <div className="mt-4">
            <span className="text-4xl font-serif text-stone-900 dark:text-white tracking-tight">
              0
            </span>
          </div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Pending payment</p>
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">Recent Transactions</h3>
          <div className="mt-4">
            <span className="text-4xl font-serif text-stone-900 dark:text-white tracking-tight">
              0
            </span>
          </div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Payments recorded</p>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800">
          <h3 className="text-lg font-medium text-stone-900 dark:text-white">Recent Invoices</h3>
        </div>
        <div className="p-6">
          {recentInvoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500 dark:text-stone-400">No invoices found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-stone-500 uppercase bg-stone-50 dark:bg-stone-800/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Invoice ID</th>
                    <th className="px-6 py-3 font-medium">Guest</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Total</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {recentInvoices.map((invoice) => {
                    const total = invoice.lineItems.reduce((acc: number, item: any) => acc + Number(item.total), 0);
                    const guest = invoice.reservation?.guest || invoice.stay?.reservation.guest;
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">{invoice.id.slice(-8)}</td>
                        <td className="px-6 py-4">{guest ? `${guest.firstName} ${guest.lastName}` : 'Walk-in'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            invoice.status === 'OPEN' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">${total.toFixed(2)}</td>
                        <td className="px-6 py-4 text-stone-500">{invoice.createdAt.toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
