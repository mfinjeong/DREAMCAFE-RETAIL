"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/formatters";

interface EndSessionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: {
    id: string;
    stationNumber: string;
    userName: string;
    durationMinutes: number;
    totalAmount: number;
  } | null;
  onConfirmCheckout: (payload: {
    sessionId: string;
    totalAmount: number;
    cashReceived: number;
  }) => Promise<void>;
}

export const EndSessionPaymentModal: React.FC<EndSessionPaymentModalProps> = ({
  isOpen,
  onClose,
  sessionData,
  onConfirmCheckout,
}) => {
  const [cashInput, setCashInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionData) return null;

  const totalAmount = sessionData.totalAmount;
  const cashReceived = parseFloat(cashInput) || 0;
  const change = cashReceived - totalAmount;
  const isInsufficient = cashReceived < totalAmount;

  const quickAmounts = [
    { label: "Exact", value: totalAmount },
    { label: "20.000", value: 20000 },
    { label: "50.000", value: 50000 },
    { label: "100.000", value: 100000 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isInsufficient) {
      setError(`Insufficient cash! Received: ${formatRupiah(cashReceived)}, Total: ${formatRupiah(totalAmount)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmCheckout({
        sessionId: sessionData.id,
        totalAmount,
        cashReceived,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Checkout failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cash Checkout • ${sessionData.stationNumber}`}
      subtitle={`${sessionData.userName} (${sessionData.durationMinutes} min)`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
            {error}
          </div>
        )}

        {/* Bill Summary */}
        <div className="p-3 bg-surface-muted border border-surface-border rounded-[8px]">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>Payment Method:</span>
            <span className="text-persona-red font-bold font-mono">CASH ONLY</span>
          </div>
          <div className="flex items-baseline justify-between pt-1 border-t border-surface-border">
            <span className="text-xs text-text-secondary font-medium">Total Bill:</span>
            <span className="text-base font-extrabold text-[#F2F3F5] font-mono">{formatRupiah(totalAmount)}</span>
          </div>
        </div>

        {/* Cash Received */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Cash Received
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">
              Rp
            </span>
            <input
              type="number"
              min="0"
              step="500"
              placeholder="0"
              value={cashInput}
              onChange={(e) => {
                setCashInput(e.target.value);
                setError(null);
              }}
              className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-9 pr-3 py-2 text-sm font-mono font-bold text-[#F2F3F5] focus:outline-none focus:border-persona-red"
              autoFocus
              required
            />
          </div>

          {/* Quick Cash Buttons */}
          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
            {quickAmounts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCashInput(q.value.toString());
                  setError(null);
                }}
                className="py-1.5 px-1 bg-surface-muted hover:bg-surface-hover border border-surface-border text-xs font-mono text-text-secondary hover:text-[#F2F3F5] rounded-[6px] transition-colors text-center cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Change Calculation Box */}
        <div
          className={`p-3 rounded-[6px] border flex items-center justify-between font-mono text-xs ${
            cashReceived === 0
              ? "bg-surface-muted border-surface-border text-text-secondary"
              : isInsufficient
              ? "bg-persona-red-subtle border-persona-red-border text-persona-red"
              : "bg-p3r-blue-subtle border-p3r-blue-border text-p3r-blue font-bold"
          }`}
        >
          <span>Change:</span>
          <span className="text-sm">
            {isInsufficient ? "Insufficient" : formatRupiah(change)}
          </span>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isInsufficient || cashReceived === 0 || isSubmitting}
            isLoading={isSubmitting}
          >
            Confirm & Complete
          </Button>
        </div>
      </form>
    </Modal>
  );
};
