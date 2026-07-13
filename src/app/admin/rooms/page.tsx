export default function RoomsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Room Management</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Manage physical rooms, capacities, and housekeeping status.</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-6 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-white font-medium rounded-lg transition-colors duration-300 border border-stone-200 dark:border-stone-700">
            Room Types
          </button>
          <button className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-medium rounded-lg shadow-sm transition-all duration-300">
            Add Room
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm min-h-[500px]">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 opacity-50 grayscale pointer-events-none">
          {/* Skeleton Room Cards */}
          {[1,2,3,4,5,6,7,8,9,10].map(i => (
             <div key={i} className="aspect-square rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center relative overflow-hidden bg-stone-50 dark:bg-stone-950">
               <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></div>
               <span className="text-2xl font-serif text-stone-900 dark:text-stone-100">{100 + i}</span>
               <span className="text-xs text-stone-500 mt-1">Villa</span>
             </div>
          ))}
        </div>
        <div className="mt-8 text-center text-sm text-stone-500">
           Waiting for database connection to load physical rooms...
        </div>
      </div>
    </div>
  );
}
