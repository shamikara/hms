export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Welcome back. Here is today's overview at the resort.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard title="Today's Arrivals" value="12" subtitle="3 pending check-ins" />
        <DashboardCard title="Occupancy Rate" value="84%" subtitle="28/34 rooms occupied" />
        <DashboardCard title="Active Safaris" value="4" subtitle="32 guests currently on drive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="h-96 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6">
           <h3 className="text-lg font-medium text-stone-800 dark:text-stone-200 mb-4">Revenue Trend</h3>
           <div className="h-full flex items-center justify-center text-stone-400 text-sm">Chart Placeholder</div>
        </div>
        <div className="h-96 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6">
           <h3 className="text-lg font-medium text-stone-800 dark:text-stone-200 mb-4">Recent Bookings</h3>
           <div className="h-full flex items-center justify-center text-stone-400 text-sm">Data Table Placeholder</div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, subtitle }: { title: string, value: string, subtitle: string }) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">{title}</h3>
      <div className="mt-4 flex items-baseline space-x-2">
        <span className="text-4xl font-serif text-stone-900 dark:text-white tracking-tight">{value}</span>
      </div>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
    </div>
  );
}
