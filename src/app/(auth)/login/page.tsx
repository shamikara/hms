import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col justify-center items-center p-4 selection:bg-emerald-200 selection:text-emerald-900">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-xl overflow-hidden border border-stone-100 dark:border-stone-800">
        <div className="h-2 w-full bg-emerald-800" />
        <div className="p-8 sm:p-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif text-stone-900 dark:text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-stone-500 dark:text-stone-400">Sign in to the Safari Enterprise Platform</p>
          </div>
          
          <LoginForm />
        </div>
      </div>
      <div className="mt-8 text-center text-sm text-stone-500 dark:text-stone-400">
        <p>&copy; {new Date().getFullYear()} Safari Resort Platform. All rights reserved.</p>
      </div>
    </div>
  );
}
