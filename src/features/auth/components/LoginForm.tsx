"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginFormValues } from "../validations/auth.schema";
import { loginAction } from "../actions/auth.actions";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    const result = await loginAction(data);
    
    if (result?.success) {
      router.push("/admin/dashboard"); // Default redirect for now
    } else {
      setError(result?.error || "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full max-w-sm mx-auto">
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Email Address</label>
        <input
          {...register("email")}
          type="email"
          disabled={isLoading}
          className="w-full px-4 py-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 focus:ring-2 focus:ring-emerald-600 outline-none transition-all duration-300"
          placeholder="admin@safariresort.com"
        />
        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Password</label>
        <input
          {...register("password")}
          type="password"
          disabled={isLoading}
          className="w-full px-4 py-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 focus:ring-2 focus:ring-emerald-600 outline-none transition-all duration-300"
          placeholder="••••••••"
        />
        {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-medium rounded-lg shadow-md transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
