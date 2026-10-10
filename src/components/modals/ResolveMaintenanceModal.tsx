"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MaintenanceItem } from "@/lib/types";

interface ResolveMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: MaintenanceItem | null;
  /** Mengembalikan pesan error, atau null bila berhasil. */
  onSubmit: (id: string, payload: { cost: number; notes?: string }) => Promise<string | null>;
}

export const ResolveMaintenanceModal: React.FC<ResolveMaintenanceModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onSubmit,
}) => {
  const [cost, setCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && ticket) {
      setCost(String(ticket.cost));
      setNotes("");
      setErrorMsg(null);
    }
  }, [isOpen, ticket]);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      setIsSubmitting(true);
      const error = await onSubmit(ticket.id, {
        cost: Number(cost) || 0,
        notes: notes.trim() || undefined,
      });
      if (error) {
        setErrorMsg(error);
        return;
      }
      onClose();
    } catch {
      setErrorMsg("Gagal menyelesaikan perbaikan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Selesaikan Perbaikan • ${ticket.stationNumber}`}
      subtitle={ticket.title}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {errorMsg && (
          <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
            {errorMsg}
          </div>
        )}

        <Input
          label="Biaya Aktual (Rp)"
          type="number"
          min={0}
          step={1000}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          required
        />

        <div className="w-full">
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Catatan Perbaikan
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Contoh: Ganti switch mouse, sudah dites"
            className="w-full bg-surface-muted border border-surface-border focus:border-persona-red rounded-[6px] px-3 py-1.5 text-xs text-[#F2F3F5] placeholder-text-muted transition-colors focus:outline-none"
          />
        </div>

        <p className="text-[11px] text-text-muted">
          Station kembali AVAILABLE bila tidak ada tiket servis aktif lain pada station yang sama.
        </p>

        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Resolve
          </Button>
        </div>
      </form>
    </Modal>
  );
};
