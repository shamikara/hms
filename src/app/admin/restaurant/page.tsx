import prisma from "@/core/db/prisma";

export default async function RestaurantPage() {
  const fbItems: any[] = [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Restaurant & Dining</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Manage food & beverage orders and dining reservations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">Today's Covers</h3>
          <div className="mt-4">
            <span className="text-4xl font-serif text-stone-900 dark:text-white tracking-tight">24</span>
          </div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Breakfast (12) • Dinner (12)</p>
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">Active Room Service</h3>
          <div className="mt-4">
            <span className="text-4xl font-serif text-stone-900 dark:text-white tracking-tight">3</span>
          </div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Preparing in kitchen</p>
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">F&B Revenue Today</h3>
          <div className="mt-4">
            <span className="text-4xl font-serif text-stone-900 dark:text-white tracking-tight">$0.00</span>
          </div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Based on posted line items</p>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800">
          <h3 className="text-lg font-medium text-stone-900 dark:text-white">Recent F&B Orders</h3>
        </div>
        <div className="p-6">
          {fbItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500 dark:text-stone-400">No food and beverage orders found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-stone-500 uppercase bg-stone-50 dark:bg-stone-800/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {fbItems.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                      <td className="px-6 py-4">{item.description}</td>
                      <td className="px-6 py-4">${Number(item.total).toFixed(2)}</td>
                      <td className="px-6 py-4">{item.createdAt.toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
