export default function BookingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Booking Management</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Manage all hotel and safari reservations.</p>
        </div>
        <button className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-medium rounded-lg shadow-sm transition-all duration-300">
          New Booking
        </button>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm min-h-[600px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            <input 
              type="text" 
              placeholder="Search guest or booking ID..." 
              className="px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-lg bg-stone-50 dark:bg-stone-950 outline-none focus:ring-2 focus:ring-emerald-600/50 w-72 transition-all"
            />
            <select className="px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-lg bg-stone-50 dark:bg-stone-950 outline-none">
              <option>All Statuses</option>
              <option>Pending</option>
              <option>Confirmed</option>
            </select>
          </div>
          <div className="flex space-x-2">
             <button className="px-4 py-2 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg text-sm font-medium transition-colors">
               List View
             </button>
             <button className="px-4 py-2 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-medium transition-colors">
               Calendar View
             </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50/50 dark:bg-stone-900/50">
          <div className="w-16 h-16 bg-stone-200 dark:bg-stone-800 rounded-full flex items-center justify-center mb-4">
             <span className="text-stone-400">📅</span>
          </div>
          <h3 className="text-lg font-medium text-stone-800 dark:text-stone-200">No bookings found</h3>
          <p className="text-stone-500 mt-1 max-w-sm text-center text-sm">Connect a database to view real-time booking data from the reservation engine.</p>
        </div>
      </div>
    </div>
  );
}
