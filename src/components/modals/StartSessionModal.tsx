"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PCStation, MemberItem, ConsoleStation } from "@/lib/types";
import { formatRupiah } from "@/lib/formatters";

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: PCStation | ConsoleStation | null;
  members: MemberItem[];
  onConfirm: (payload: {
    stationId: string;
    type: "PC" | "CONSOLE";
    memberId?: string | null;
    guestName?: string | null;
    durationMinutes: number;
    currentGame?: string;
  }) => Promise<void>;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({
  isOpen,
  onClose,
  station,
  members,
  onConfirm,
}) => {
  const [memberType, setMemberType] = useState<"member" | "guest">("member");
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || "");
  const [guestName, setGuestName] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [currentGame, setCurrentGame] = useState<string>("Valorant");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if ((!selectedMemberId || !members.some((m) => m.id === selectedMemberId)) && members.length > 0) {
        setSelectedMemberId(members[0].id);
      }
      if (station) {
        if ("installedGames" in station && station.installedGames && station.installedGames.length > 0) {
          setCurrentGame(station.installedGames[0]);
        } else if ("specsCpu" in station) {
          setCurrentGame("Valorant");
        }
      }
    }
  }, [isOpen, members, selectedMemberId, station]);

  if (!station) return null;

  const hourlyRate = station.hourlyRate || 10000;
  const totalPrice = Math.round((durationMinutes / 60) * hourlyRate);

  const durationOptions = [
    { label: "1h", value: 60 },
    { label: "2h", value: 120 },
    { label: "3h", value: 180 },
    { label: "4h", value: 240 },
    { label: "5h", value: 300 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (station.status === "IN_USE") {
      setErrorMessage(`Station ${station.stationNumber} is already in use.`);
      return;
    }

    if (memberType === "guest" && (!guestName || guestName.trim().length === 0)) {
      setErrorMessage("Guest name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm({
        stationId: station.id,
        type: "specsCpu" in station ? "PC" : "CONSOLE",
        memberId: memberType === "member" ? selectedMemberId : null,
        guestName: memberType === "guest" ? guestName.trim() : null,
        durationMinutes,
        currentGame,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to start session.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Start Session • ${station.stationNumber}`}
      subtitle={`Rate: ${formatRupiah(hourlyRate)} / hr`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {errorMessage && (
          <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
            {errorMessage}
          </div>
        )}

        {/* Member or Guest Toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-muted border border-surface-border rounded-[6px]">
          <button
            type="button"
            onClick={() => setMemberType("member")}
            className={`py-1.5 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer ${
              memberType === "member"
                ? "bg-persona-red text-white"
                : "text-text-secondary hover:text-[#F2F3F5]"
            }`}
          >
            Registered Member
          </button>
          <button
            type="button"
            onClick={() => setMemberType("guest")}
            className={`py-1.5 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer ${
              memberType === "guest"
                ? "bg-persona-red text-white"
                : "text-text-secondary hover:text-[#F2F3F5]"
            }`}
          >
            Guest Player
          </button>
        </div>

        {memberType === "member" ? (
          <Select
            label="Member Account"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            options={members.map((m) => ({
              label: `${m.fullName} (@${m.username})`,
              value: m.id,
            }))}
          />
        ) : (
          <Input
            label="Guest Name"
            placeholder="e.g. Guest 01"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
          />
        )}

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Session Duration
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {durationOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDurationMinutes(opt.value)}
                className={`py-2 px-1 rounded-[6px] text-xs font-bold transition-colors text-center border cursor-pointer ${
                  durationMinutes === opt.value
                    ? "bg-persona-red-subtle border-persona-red text-white"
                    : "bg-surface-muted border-surface-border text-text-secondary hover:text-[#F2F3F5]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Game Title"
          value={currentGame}
          onChange={(e) => setCurrentGame(e.target.value)}
        />

        {/* Total Price Summary */}
        <div className="p-3 bg-surface-muted border border-surface-border rounded-[6px] flex items-center justify-between">
          <span className="text-text-secondary text-xs font-medium">Estimated Bill:</span>
          <span className="text-sm font-extrabold text-[#F2F3F5] font-mono">{formatRupiah(totalPrice)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Start Session
          </Button>
        </div>
      </form>
    </Modal>
  );
};
