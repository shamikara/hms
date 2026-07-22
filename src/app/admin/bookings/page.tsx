import { getAllReservations, updateReservationStatus } from "@/features/admin/actions/reservations.actions";
import { format } from "date-fns";

export default async function BookingsPage() {
  const reservationsResult = await getAllReservations();
  const reservations = (reservationsResult.success && reservationsResult.data) ? reservationsResult.data : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Reservations Manager</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">View and manage all guest reservations.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-500 dark:text-stone-400">
            <thead className="bg-stone-50 dark:bg-stone-950 text-xs uppercase font-medium text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Check-In</th>
                <th className="px-6 py-4">Check-Out</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-500">
                    No reservations found.
                  </td>
                </tr>
              ) : (
                reservations.map((res: any) => (
                  <tr key={res.id} className="border-b border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-950/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900 dark:text-stone-100">{res.guest.firstName} {res.guest.lastName}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{res.guest.email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(res.checkInDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(res.checkOutDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        res.status === 'DRAFT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                        res.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {format(new Date(res.createdAt), "MMM d, yyyy")}
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
