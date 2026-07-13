export default function SafariPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Safari Operations</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Manage fleet, dispatch guides, and schedule game drives.</p>
        </div>
        <button className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-medium rounded-lg shadow-sm transition-all duration-300">
          Schedule Drive
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Active Vehicles" value="8/12" color="emerald" />
        <MetricCard title="Guides on Tour" value="6" color="emerald" />
        <MetricCard title="Vehicles in Maintenance" value="1" color="amber" />
        <MetricCard title="Today's Sightings" value="24" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm min-h-[500px]">
          <h2 className="text-lg font-medium text-stone-800 dark:text-stone-200 mb-6">Today's Dispatch Board</h2>
          <div className="flex flex-col items-center justify-center h-[350px] border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50/50 dark:bg-stone-900/50">
            <span className="text-stone-400 mb-2 text-2xl">🗺️</span>
            <p className="text-stone-500 text-sm">Database connection required to load dispatch manifest.</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-stone-800 dark:text-stone-200 mb-6">Recent Wildlife Logs</h2>
          <div className="space-y-4">
             {/* Placeholders */}
             {[1, 2, 3].map(i => (
               <div key={i} className="p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex justify-between items-center opacity-50 grayscale">
                 <div>
                   <h4 className="font-medium text-stone-800 dark:text-stone-200">Leopard</h4>
                   <p className="text-xs text-stone-500 mt-1">Northern River Route • 2 hours ago</p>
                 </div>
                 <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-md">Rare</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string, value: string, color: string }) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">{title}</h3>
      <div className="mt-4 text-3xl font-serif text-stone-900 dark:text-white tracking-tight">{value}</div>
    </div>
  );
}
