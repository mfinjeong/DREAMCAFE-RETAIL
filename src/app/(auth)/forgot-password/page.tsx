"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ identifier }),
      });
      const result = await response.json();
      setMessage(result.message || "Permintaan diproses.");
    } catch {
      setMessage("Terjadi kesalahan. Coba lagi nanti.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-surface border border-surface-border rounded-[6px] p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Lupa Password</h1>
          <p className="text-sm text-text-muted mt-1">
            Masukkan username atau email Anda. Jika akun terdaftar, tautan reset akan dikirim.
          </p>
        </div>

        <Input
          label="Username atau email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
          autoComplete="email"
        />

        {message && <p className="text-sm text-text-muted bg-surface-secondary p-3 rounded">{message}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Memproses..." : "Kirim tautan reset"}
        </Button>

        <div className="text-center text-sm">
          <Link href="/login" className="text-accent-blue hover:underline">
            Kembali ke login
          </Link>
        </div>
      </form>
    </main>
  );
}
