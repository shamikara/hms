import { getDashboardMetrics, getRecentReservations } from "@/features/admin/actions/dashboard.actions";
import { format } from "date-fns";

export default async function DashboardPage() {
  const [metricsResult, recentReservationsResult] = await Promise.all([
    getDashboardMetrics(),
    getRecentReservations()
  ]);

  const metrics = (metricsResult.success && metricsResult.data) ? metricsResult.data : { todayArrivals: 0, pendingReservations: 0, totalGuests: 0 };
  const recentReservations = (recentReservationsResult.success && recentReservationsResult.data) ? recentReservationsResult.data : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Welcome back. Here is today's overview at the resort.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard title="Today's Arrivals" value={metrics.todayArrivals.toString()} subtitle="Pending check-ins" />
        <DashboardCard title="Pending Reservations" value={metrics.pendingReservations.toString()} subtitle="Awaiting review" />
        <DashboardCard title="Total Guests" value={metrics.totalGuests.toString()} subtitle="Registered in CRM" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="h-96 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6 flex flex-col">
           <h3 className="text-lg font-medium text-stone-800 dark:text-stone-200 mb-4">Revenue Trend</h3>
           <div className="flex-1 flex items-center justify-center text-stone-400 text-sm bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">Chart Coming Soon</div>
        </div>
        <div className="h-96 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col">
           <h3 className="text-lg font-medium text-stone-800 dark:text-stone-200 mb-4">Recent Bookings</h3>
           <div className="flex-1 overflow-y-auto pr-2 space-y-3">
             {recentReservations.length === 0 ? (
               <div className="h-full flex items-center justify-center text-stone-400 text-sm">No recent bookings</div>
             ) : (
               recentReservations.map((res: any) => (
                 <div key={res.id} className="p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 flex justify-between items-center">
                   <div>
                     <p className="font-medium text-stone-900 dark:text-stone-100">{res.guest.firstName} {res.guest.lastName}</p>
                     <p className="text-xs text-stone-500 mt-1">{format(new Date(res.checkInDate), "MMM d")} - {format(new Date(res.checkOutDate), "MMM d, yyyy")}</p>
                   </div>
                   <span className={`px-2 py-1 rounded-full text-xs font-medium ${res.status === 'DRAFT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                     {res.status}
                   </span>
                 </div>
               ))
             )}
           </div>
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
