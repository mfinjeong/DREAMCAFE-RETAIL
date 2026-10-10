"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface MaintenanceStationOption {
  type: "PC" | "CONSOLE";
  id: string;
  stationNumber: string;
  name: string;
  status: string;
}

export interface CreateMaintenancePayload {
  type: "PC" | "CONSOLE";
  stationId: string;
  title: string;
  description: string;
  technician?: string;
  cost?: number;
}

interface CreateMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: MaintenanceStationOption[];
  /** Mengembalikan pesan error, atau null bila berhasil. */
  onSubmit: (payload: CreateMaintenancePayload) => Promise<string | null>;
}

export const CreateMaintenanceModal: React.FC<CreateMaintenanceModalProps> = ({
  isOpen,
  onClose,
  stations,
  onSubmit,
}) => {
  const [stationKey, setStationKey] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [technician, setTechnician] = useState("");
  const [cost, setCost] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setStationKey("");
    setTitle("");
    setDescription("");
    setTechnician("");
    setCost("");
    setErrorMsg(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const station = stations.find((s) => `${s.type}:${s.id}` === stationKey);
    if (!station) {
      setErrorMsg("Station wajib dipilih");
      return;
    }

    try {
      setIsSubmitting(true);
      const error = await onSubmit({
        type: station.type,
        stationId: station.id,
        title,
        description,
        technician: technician.trim() || undefined,
        cost: cost === "" ? undefined : Number(cost),
      });
      if (error) {
        setErrorMsg(error);
        return;
      }
      reset();
      onClose();
    } catch {
      setErrorMsg("Gagal membuat tiket servis.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const options = [
    { label: "Pilih station...", value: "" },
    ...stations.map((s) => ({
      label: `${s.stationNumber} — ${s.name} (${s.status})`,
      value: `${s.type}:${s.id}`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Lapor Kerusakan"
      subtitle="Station akan dikunci (MAINTENANCE) sampai perbaikan selesai"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {errorMsg && (
          <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
            {errorMsg}
          </div>
        )}

        <Select
          label="Station"
          value={stationKey}
          onChange={(e) => setStationKey(e.target.value)}
          options={options}
          required
        />

        <Input
          label="Keluhan"
          placeholder="Contoh: Klik kiri mouse mati"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="w-full">
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Detail Kerusakan
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
            placeholder="Jelaskan gejala dan kapan terjadi"
            className="w-full bg-surface-muted border border-surface-border focus:border-persona-red rounded-[6px] px-3 py-1.5 text-xs text-[#F2F3F5] placeholder-text-muted transition-colors focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Input
            label="Teknisi (Opsional)"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
          />
          <Input
            label="Estimasi Biaya (Rp)"
            type="number"
            min={0}
            step={1000}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Create Ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
};
