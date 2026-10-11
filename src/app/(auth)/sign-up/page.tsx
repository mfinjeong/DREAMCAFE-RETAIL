"use client";

import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4 bg-surface border border-surface-border rounded-[6px] p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Pembuatan Akun Staf</h1>
          <p className="text-sm text-text-muted mt-3">
            Akun staf DREAMCAFÉ tidak dapat dibuat secara mandiri. Pendaftaran hanya dapat dilakukan melalui admin atau undangan tervalidasi.
          </p>
          <p className="text-sm text-text-muted mt-3">
            Silakan hubungi admin sistem untuk membuat akun staf baru.
          </p>
        </div>

        <Link href="/login" className="block w-full text-center py-2 px-4 bg-surface-hover border border-surface-border rounded hover:bg-opacity-80 text-sm text-text-primary">
          Kembali ke Login
        </Link>
      </div>
    </main>
  );
}