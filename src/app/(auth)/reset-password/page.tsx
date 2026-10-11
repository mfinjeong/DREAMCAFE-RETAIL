"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Password baru dan konfirmasi tidak cocok");
      return;
    }

    if (!token) {
      setError("Token reset tidak ditemukan di URL");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token, newPassword }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Gagal mereset password");
      } else {
        setMessage(result.message || "Password berhasil direset.");
        setSucceeded(true);
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi nanti.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-surface border border-surface-border rounded-[6px] p-6 shadow-sm">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Reset Password</h1>
        <p className="text-sm text-text-muted mt-1">Masukkan password baru Anda.</p>
      </div>

      {!token && (
        <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded">
          Token reset tidak ditemukan. Pastikan Anda membuka tautan lengkap dari email.
        </p>
      )}

      <Input
        label="Password baru"
        type="password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        required
        autoComplete="new-password"
        disabled={succeeded}
      />
      <Input
        label="Konfirmasi password baru"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
        autoComplete="new-password"
        disabled={succeeded}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-text-muted bg-surface-secondary p-3 rounded">{message}</p>}

      <Button type="submit" disabled={isSubmitting || succeeded || !token} className="w-full">
        {isSubmitting ? "Memproses..." : "Reset password"}
      </Button>

      <div className="text-center text-sm">
        <Link href="/login" className="text-accent-blue hover:underline">
          Kembali ke login
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="text-text-muted">Memuat...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
