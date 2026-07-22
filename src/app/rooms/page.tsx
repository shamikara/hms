import Link from "next/link";

export default function RoomsPage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100 flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-serif mb-4">Accommodation</h1>
        <p className="text-stone-500 mb-8">Detailed room listings are coming soon.</p>
        <Link href="/" className="text-emerald-600 hover:text-emerald-500 underline">
          Return Home
        </Link>
      </div>
    </div>
  );
}
