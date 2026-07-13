export default function GuestsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Guest CRM</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Manage guest profiles, stay history, and VIP preferences.</p>
        </div>
        <button className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-medium rounded-lg shadow-sm transition-all duration-300">
          Add Guest Record
        </button>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm min-h-[600px] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-950/50">
          <input 
            type="text" 
            placeholder="Search by name, email, or passport..." 
            className="px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-900 outline-none focus:ring-2 focus:ring-emerald-600/50 w-96 transition-all text-sm"
          />
          <button className="text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors">
            Filter Options
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center bg-stone-50/30 dark:bg-stone-900/30">
          <div className="w-16 h-16 bg-stone-200 dark:bg-stone-800 rounded-full flex items-center justify-center mb-4">
             <span className="text-stone-400">👥</span>
          </div>
          <h3 className="text-lg font-medium text-stone-800 dark:text-stone-200">No guest records loaded</h3>
          <p className="text-stone-500 mt-1 max-w-sm text-center text-sm">A database connection is required to populate the CRM table.</p>
        </div>
      </div>
    </div>
  );
}
