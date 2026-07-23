import prisma from "@/core/db/prisma";

const mockFbOrders = [
  { id: "ORD-101", table: "Villa 101 Private Dining", items: "Grilled Lagoon Prawns, Coconut Curry, Sauvignon Blanc", total: 185.0, status: "SERVED", time: "12 mins ago" },
  { id: "ORD-102", table: "Main Pavilion Table 4", items: "Udawalawe Organic Salad, Ceylon Spiced Tea, Mango Tart", total: 65.0, status: "KITCHEN", time: "5 mins ago" },
  { id: "ORD-103", table: "Bush Dining Clearing B", items: "5-Course Wild Tasting Menu & Sommelier Wine Pairing", total: 420.0, status: "CONFIRMED", time: "25 mins ago" },
  { id: "ORD-104", table: "Villa 201 Room Service", items: "Club Sandwich, Fresh Passionfruit Juice, Artisan Espresso", total: 48.0, status: "SERVED", time: "40 mins ago" },
];

export default async function RestaurantPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Restaurant & Dining POS</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
            Monitor kitchen order dispatches, villa room service tickets, and organic estate gastronomy covers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">Today's Covers</h3>
          <div className="mt-4">
            <span className="text-4xl font-serif font-bold text-stone-900 dark:text-white tracking-tight">38 Covers</span>
          </div>
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 font-mono">Breakfast (16) • Lunch (10) • Dinner (12)</p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">Active Kitchen Orders</h3>
          <div className="mt-4">
            <span className="text-4xl font-serif font-bold text-stone-900 dark:text-white tracking-tight">2 Active</span>
          </div>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-mono">In Preparation (Kitchen Station 1)</p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">F&B Gross Today</h3>
          <div className="mt-4">
            <span className="text-4xl font-serif font-bold text-stone-900 dark:text-white tracking-tight">$1,418.00</span>
          </div>
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-mono">Room Posting & Credit Card</p>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
          <h2 className="text-lg font-serif font-medium text-stone-900 dark:text-white">Live F&B Order Manifest</h2>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">Kitchen Display Sync</span>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-stone-500 uppercase font-mono bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="px-6 py-3 font-medium">Order Ticket</th>
                <th className="px-6 py-3 font-medium">Location / Table</th>
                <th className="px-6 py-3 font-medium">Menu Items</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {mockFbOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-stone-50 dark:hover:bg-stone-950/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-stone-900 dark:text-stone-100">{ord.id}</td>
                  <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-100">{ord.table}</td>
                  <td className="px-6 py-4 text-xs text-stone-400 max-w-xs truncate">{ord.items}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold ${
                      ord.status === 'SERVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-800/40' :
                      ord.status === 'KITCHEN' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-800/40' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-800/40'
                    }`}>
                      {ord.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">${ord.total.toFixed(2)}</td>
                  <td className="px-6 py-4 text-xs font-mono text-stone-500">{ord.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
