"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { sanitizeRedirectUrl } from "@/lib/redirect";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = sanitizeRedirectUrl(searchParams.get("from"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login gagal");
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-surface border border-surface-border rounded-[6px] p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Login DREAMCAFÉ</h1>
          <p className="text-sm text-text-muted mt-1">Masuk untuk mengelola katalog game.</p>
        </div>

        <Input label="Username atau email" value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" />
        <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Memproses..." : "Masuk"}
        </Button>

        <div className="text-center text-sm space-y-2">
          <Link href="/forgot-password" className="text-accent-blue hover:underline block">
            Lupa password?
          </Link>
          <p className="text-text-muted">
            Belum punya akun?{" "}
            <Link href="/sign-up" className="text-accent-blue hover:underline">
              Daftar di sini
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center bg-background px-4"><div className="w-full max-w-sm h-64 bg-surface border border-surface-border rounded-[6px] animate-pulse" /></main>}>
      <LoginForm />
    </Suspense>
  );
}
