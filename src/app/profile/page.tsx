"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/formatters";
import { User, Shield, Clock, Monitor, Key, Trash2 } from "lucide-react";

interface ProfileData {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  sessions: {
    id: string;
    createdAt: string;
    expiresAt: string;
  }[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/auth/profile", { credentials: "same-origin" });
      const json = await res.json();

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat profil");
      }

      setProfile(json.data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter");
      return;
    }

    try {
      setIsSubmittingPassword(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengubah password");
      }

      alert("Password berhasil diubah. Silakan login kembali.");
      router.push("/login");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Gagal mengubah password");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Cabut sesi ini?")) return;

    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mencabut sesi");
      }

      await loadProfile();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mencabut sesi");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm text-text-muted">Memuat profil...</p>
      </div>
    );
  }

  if (errorMessage || !profile) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="p-4 bg-surface border border-red-500/20 rounded-[6px]">
          <p className="text-sm text-red-400">{errorMessage || "Profil tidak ditemukan"}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadProfile}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-3.5 bg-coffee" />
        <h2 className="text-sm font-bold text-text-primary tracking-tight">Profil Akun</h2>
      </div>

      <div className="p-5 bg-surface border border-surface-border rounded-[6px] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
          <User className="w-4 h-4 text-text-muted" />
          <span className="text-xs uppercase tracking-wider text-text-muted font-semibold">
            Informasi Akun
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted mb-1">Nama Lengkap</p>
            <p className="text-sm text-text-primary font-medium">{profile.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Username</p>
            <p className="text-sm text-text-primary font-medium">{profile.username}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Email</p>
            <p className="text-sm text-text-primary font-medium">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Role</p>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-coffee" />
              <p className="text-sm text-text-primary font-semibold">{profile.role}</p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-surface-border">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setChangePasswordModalOpen(true)}
          >
            <Key className="w-3.5 h-3.5" /> Ubah Password
          </Button>
        </div>
      </div>

      <div className="p-5 bg-surface border border-surface-border rounded-[6px] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
          <Monitor className="w-4 h-4 text-text-muted" />
          <span className="text-xs uppercase tracking-wider text-text-muted font-semibold">
            Sesi Aktif ({profile.sessions.length})
          </span>
        </div>

        {profile.sessions.length === 0 ? (
          <p className="text-xs text-text-muted">Tidak ada sesi aktif</p>
        ) : (
          <div className="space-y-3">
            {profile.sessions.map((session) => (
              <div
                key={session.id}
                className="p-3 bg-bg border border-surface-border rounded-[6px] flex items-center justify-between gap-3"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-text-muted" />
                    <p className="text-xs text-text-primary">
                      Dibuat: {formatDateTime(session.createdAt)}
                    </p>
                  </div>
                  <p className="text-xs text-text-muted">
                    Kadaluarsa: {formatDateTime(session.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRevokeSession(session.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Cabut
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={changePasswordModalOpen}
        onClose={() => {
          setChangePasswordModalOpen(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordError(null);
        }}
        title="Ubah Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[6px]">
              <p className="text-xs text-red-400">{passwordError}</p>
            </div>
          )}

          <Input
            label="Password Lama"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Input
            label="Password Baru"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            helperText="Minimal 8 karakter"
          />

          <Input
            label="Konfirmasi Password Baru"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setChangePasswordModalOpen(false)}
              disabled={isSubmittingPassword}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmittingPassword}>
              {isSubmittingPassword ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
