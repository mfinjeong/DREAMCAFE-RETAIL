"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SettingsPage() {
  const [rates, setRates] = useState({
    regularRate: 10000,
    vipRate: 15000,
    arenaRate: 20000,
    consolePs5Rate: 20000,
    consoleSwitchRate: 15000,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-3.5 bg-persona-red persona-slash" />
        <h2 className="text-sm font-bold text-text-primary tracking-tight font-sans">
          System Settings & Rates
        </h2>
      </div>

      <form onSubmit={handleSave} className="space-y-3.5">
        {/* Hourly Rates */}
        <div className="p-4 bg-surface border border-surface-border rounded-[6px] space-y-3.5">
          <span className="text-xs uppercase tracking-wider text-text-muted font-semibold block">
            Hourly Station Rates (IDR)
          </span>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Regular Zone"
              type="number"
              step="1000"
              value={rates.regularRate}
              onChange={(e) => setRates({ ...rates, regularRate: Number(e.target.value) })}
              required
            />
            <Input
              label="VIP Zone"
              type="number"
              step="1000"
              value={rates.vipRate}
              onChange={(e) => setRates({ ...rates, vipRate: Number(e.target.value) })}
              required
            />
            <Input
              label="Arena Esports"
              type="number"
              step="1000"
              value={rates.arenaRate}
              onChange={(e) => setRates({ ...rates, arenaRate: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-border">
            <Input
              label="Console PS5"
              type="number"
              step="1000"
              value={rates.consolePs5Rate}
              onChange={(e) => setRates({ ...rates, consolePs5Rate: Number(e.target.value) })}
              required
            />
            <Input
              label="Console Switch"
              type="number"
              step="1000"
              value={rates.consoleSwitchRate}
              onChange={(e) => setRates({ ...rates, consoleSwitchRate: Number(e.target.value) })}
              required
            />
          </div>
        </div>

        {/* Policy Notice */}
        <div className="p-3.5 bg-surface border border-surface-border rounded-[6px] text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-persona-red" />
            <span className="text-[11px] uppercase tracking-wider text-text-primary font-semibold">
              Payment Mode: Physical Cash Only
            </span>
          </div>
          <p className="text-xs text-text-muted pl-3.5">
            DREAMCAFE operates on physical cash register workflows. Change calculation and cash transactions are enforced by default.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && (
            <span className="text-xs font-mono text-p3r-blue font-semibold">Settings Saved Successfully</span>
          )}
          <Button type="submit" variant="primary" size="sm">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
