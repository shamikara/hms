import { getAllGuests } from "@/features/admin/actions/guests.actions";
import { format } from "date-fns";

export default async function GuestsPage() {
  const guestsResult = await getAllGuests();
  const guests = (guestsResult.success && guestsResult.data) ? guestsResult.data : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Guest CRM</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Manage guest profiles, stay history, and VIP preferences.</p>
        </div>
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

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-500 dark:text-stone-400">
            <thead className="bg-stone-50 dark:bg-stone-950 text-xs uppercase font-medium text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="px-6 py-4">Guest Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Total Reservations</th>
                <th className="px-6 py-4">Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {guests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                    No guest records found.
                  </td>
                </tr>
              ) : (
                guests.map((guest: any) => (
                  <tr key={guest.id} className="border-b border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-950/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900 dark:text-stone-100">{guest.firstName} {guest.lastName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {guest.email}
                      {guest.phone && <p className="text-xs text-stone-400 mt-0.5">{guest.phone}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400">
                        {guest.reservations ? guest.reservations.length : 0} Stays
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {format(new Date(guest.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
