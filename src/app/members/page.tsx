"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MemberItem, MemberTier } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { Plus, Search, Eye, Edit2, Trash2, RefreshCw, AlertTriangle, Trophy, Coins, Wallet, Clock, Receipt, Gamepad2 } from "lucide-react";

interface MemberDetailData extends MemberItem {
  totalSpending?: number;
  sessions?: {
    id: string;
    sessionNumber: string;
    stationName: string;
    type: string;
    durationMinutes: number;
    totalPrice: number;
    status: string;
    startTime: string;
  }[];
  transactions?: {
    id: string;
    invoiceNumber: string;
    type: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[];
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create Form State
  const [newMember, setNewMember] = useState({
    fullName: "",
    username: "",
    phoneNumber: "",
    email: "",
    tier: "REGULAR" as MemberTier,
    balance: 0,
    notes: "",
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    id: "",
    fullName: "",
    username: "",
    phoneNumber: "",
    email: "",
    tier: "REGULAR" as MemberTier,
    balance: 0,
    notes: "",
  });

  // Fetch members with backend search and filtering
  const fetchMembers = useCallback(async (query: string, tier: string) => {
    try {
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (tier !== "ALL") params.set("tier", tier);

      const res = await fetch(`/api/members?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load members from database");
      }
      setMembers(json.data);
    } catch (e: unknown) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : "Database connection failed");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Debounced search and filter execution via backend service
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers(searchQuery, selectedTier);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedTier, fetchMembers]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchMembers(searchQuery, selectedTier);
  };

  // Create member handler
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      setIsSubmitting(true);
      const payload = {
        fullName: newMember.fullName.trim(),
        username: newMember.username.trim() || undefined,
        phoneNumber: newMember.phoneNumber.trim() || undefined,
        email: newMember.email.trim() || undefined,
        tier: newMember.tier,
        balance: Number(newMember.balance) || 0,
        notes: newMember.notes.trim() || undefined,
      };

      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        setFormError(json.message);
        return;
      }

      setCreateModalOpen(false);
      setNewMember({
        fullName: "",
        username: "",
        phoneNumber: "",
        email: "",
        tier: "REGULAR",
        balance: 0,
        notes: "",
      });
      await fetchMembers(searchQuery, selectedTier);
    } catch {
      setFormError("Failed to register member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (m: MemberItem) => {
    setFormError(null);
    setEditForm({
      id: m.id,
      fullName: m.fullName,
      username: m.username,
      phoneNumber: m.phoneNumber || "",
      email: m.email || "",
      tier: m.tier,
      balance: m.balance,
      notes: m.notes || "",
    });
    setEditModalOpen(true);
  };

  // Edit member handler
  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      setIsSubmitting(true);
      const payload = {
        fullName: editForm.fullName.trim(),
        username: editForm.username.trim(),
        phoneNumber: editForm.phoneNumber.trim() || undefined,
        email: editForm.email.trim() || undefined,
        tier: editForm.tier,
        balance: Number(editForm.balance),
        notes: editForm.notes.trim() || undefined,
      };

      const res = await fetch(`/api/members/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        setFormError(json.message);
        return;
      }

      setEditModalOpen(false);
      await fetchMembers(searchQuery, selectedTier);
    } catch {
      setFormError("Failed to update member profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // View member detail handler
  const handleOpenDetail = async (m: MemberItem) => {
    setSelectedMember(m);
    setMemberDetail(null);
    setDetailModalOpen(true);
    setLoadingDetail(true);

    try {
      const res = await fetch(`/api/members/${m.id}`);
      const json = await res.json();
      if (json.success) {
        setMemberDetail(json.data);
      }
    } catch (e) {
      console.error("Failed to load member detail:", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Delete member handler
  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Delete member ${name}? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        alert(json.message);
        return;
      }
      await fetchMembers(searchQuery, selectedTier);
    } catch {
      alert("Failed to delete member.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></span>
          <h2 className="text-xs font-bold text-[#F2F3F5] uppercase tracking-wider font-sans">
            Members Directory & Rankings
          </h2>
          <span className="text-[11px] font-mono text-text-secondary">
            ({members.length} members loaded from database)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className={`p-1.5 text-text-secondary hover:text-[#F2F3F5] bg-surface-muted hover:bg-surface-hover rounded-[4px] border border-surface-border transition-colors cursor-pointer ${
              isRefreshing ? "animate-spin text-persona-red" : ""
            }`}
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormError(null);
              setCreateModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-persona-red-subtle border border-persona-red-border rounded-[8px] text-xs text-persona-red flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Connection Error: {errorMessage}</span>
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchMembers(searchQuery, selectedTier);
            }}
            className="px-2.5 py-1 bg-persona-red hover:bg-persona-red-hover text-white rounded-[4px] text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Row: Backend Service Search & Tier Filter */}
      <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-[#F2F3F5] placeholder-text-muted focus:outline-none focus:border-persona-red font-sans"
          />
        </div>

        <div className="flex items-center gap-1.5 font-sans text-xs">
          {["ALL", "REGULAR", "VIP", "PRO"].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
                selectedTier === tier
                  ? "bg-persona-red text-white"
                  : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Member Profile</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Level / XP</TableHead>
            <TableHead>Coins</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className="h-32 text-center text-text-secondary text-xs font-mono">
                <div className="flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-persona-red" />
                  <span>Loading members from database...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-32 text-center text-text-secondary text-xs font-mono">
                No members found matching filters
              </TableCell>
            </TableRow>
          ) : (
            members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-[11px] text-[#F2F3F5] font-semibold">
                  {m.memberCode}
                </TableCell>
                <TableCell className="text-xs">
                  <span className="font-bold text-[#F2F3F5] block font-sans">@{m.username}</span>
                  <span className="text-[11px] text-text-secondary truncate block max-w-[150px]">{m.fullName}</span>
                </TableCell>
                <TableCell className="font-mono text-[11px] text-text-secondary">
                  {m.phoneNumber || "-"}
                </TableCell>
                <TableCell>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-[3px] border font-bold ${
                      m.tier === "PRO"
                        ? "bg-persona-red-subtle border-persona-red-border text-persona-red"
                        : m.tier === "VIP"
                        ? "bg-p3r-blue-subtle border-p3r-blue-border text-p3r-blue"
                        : "bg-surface-muted border-surface-border text-text-secondary"
                    }`}
                  >
                    {m.tier}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-text-secondary font-medium">
                  Lv. {m.level} ({m.xp} XP)
                </TableCell>
                <TableCell className="font-mono text-xs text-[#F2F3F5] font-semibold">
                  {m.dreamCoins}
                </TableCell>
                <TableCell className="font-mono text-xs text-p3r-blue font-bold">
                  {formatRupiah(m.balance)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/members/${m.id}/gaming`}
                      className="p-1.5 rounded-[4px] bg-surface-muted hover:bg-surface-hover text-persona-blue hover:text-white border border-surface-border cursor-pointer transition-colors"
                      title="Gaming Profile & Stats"
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleOpenDetail(m)}
                      className="p-1.5 rounded-[4px] bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-[#F2F3F5] border border-surface-border cursor-pointer transition-colors"
                      title="View Member Profile"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1.5 rounded-[4px] bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-[#F2F3F5] border border-surface-border cursor-pointer transition-colors"
                      title="Edit Member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(m.id, m.fullName)}
                      className="p-1.5 rounded-[4px] bg-persona-red-subtle hover:bg-persona-red text-persona-red hover:text-white border border-persona-red-border cursor-pointer transition-colors"
                      title="Delete Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>

      {/* Add Member Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register Member"
        subtitle="New DREAMCAFE gaming account"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateMember} className="space-y-3.5">
          {formError && (
            <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Budi Santoso"
            value={newMember.fullName}
            onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Username (Optional)"
              placeholder="Auto-generated if empty"
              value={newMember.username}
              onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="0812xxxxxxxx"
              value={newMember.phoneNumber}
              onChange={(e) => setNewMember({ ...newMember, phoneNumber: e.target.value })}
            />
          </div>

          <Input
            label="Email (Optional)"
            type="email"
            placeholder="budi@example.com"
            value={newMember.email}
            onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Select
              label="Tier"
              value={newMember.tier}
              onChange={(e) => setNewMember({ ...newMember, tier: e.target.value as MemberTier })}
              options={[
                { label: "REGULAR", value: "REGULAR" },
                { label: "VIP", value: "VIP" },
                { label: "PRO", value: "PRO" },
              ]}
            />
            <Input
              label="Initial Deposit (Rp)"
              type="number"
              step="5000"
              value={newMember.balance}
              onChange={(e) => setNewMember({ ...newMember, balance: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Notes (Optional)"
            placeholder="e.g. VIP Member"
            value={newMember.notes}
            onChange={(e) => setNewMember({ ...newMember, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Register
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Member Profile"
        subtitle={`@${editForm.username}`}
        maxWidth="sm"
      >
        <form onSubmit={handleEditMember} className="space-y-3.5">
          {formError && (
            <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Full Name"
            value={editForm.fullName}
            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Username"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={editForm.phoneNumber}
              onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Select
              label="Tier"
              value={editForm.tier}
              onChange={(e) => setEditForm({ ...editForm, tier: e.target.value as MemberTier })}
              options={[
                { label: "REGULAR", value: "REGULAR" },
                { label: "VIP", value: "VIP" },
                { label: "PRO", value: "PRO" },
              ]}
            />
            <Input
              label="Balance (Rp)"
              type="number"
              step="1000"
              value={editForm.balance}
              onChange={(e) => setEditForm({ ...editForm, balance: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Notes"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Enhanced Profile Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedMember ? `@${selectedMember.username} • ${selectedMember.fullName}` : "Member Profile"}
        subtitle={selectedMember ? `Member ID: ${selectedMember.memberCode}` : undefined}
        maxWidth="md"
      >
        {selectedMember && (
          <div className="space-y-3.5 text-xs">
            {/* Profile Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
                <span className="text-[10px] text-text-muted uppercase block font-mono">Member Tier</span>
                <span className="font-bold text-[#F2F3F5] text-xs flex items-center gap-1 mt-0.5">
                  <Trophy className="w-3 h-3 text-persona-red" />
                  {selectedMember.tier}
                </span>
              </div>
              <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
                <span className="text-[10px] text-text-muted uppercase block font-mono">Progression</span>
                <span className="font-bold text-[#F2F3F5] text-xs block mt-0.5">
                  Lv. {selectedMember.level} ({selectedMember.xp} XP)
                </span>
              </div>
              <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
                <span className="text-[10px] text-text-muted uppercase block font-mono">DREAM Coins</span>
                <span className="font-bold text-[#F2F3F5] text-xs flex items-center gap-1 mt-0.5">
                  <Coins className="w-3 h-3 text-pamber" />
                  {selectedMember.dreamCoins}
                </span>
              </div>
              <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px]">
                <span className="text-[10px] text-text-muted uppercase block font-mono">Account Balance</span>
                <span className="font-bold text-p3r-blue text-xs block mt-0.5 font-mono">
                  {formatRupiah(selectedMember.balance)}
                </span>
              </div>
            </div>

            {/* Profile Contact & Spending */}
            <div className="p-3 bg-surface-muted border border-surface-border rounded-[8px] space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Phone Number:</span>
                <span className="text-[#F2F3F5]">{selectedMember.phoneNumber || "-"}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Email Address:</span>
                <span className="text-[#F2F3F5]">{selectedMember.email || "-"}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Member Since:</span>
                <span className="text-[#F2F3F5]">{formatDateTime(selectedMember.createdAt)}</span>
              </div>
              {memberDetail?.totalSpending !== undefined && (
                <div className="flex justify-between text-text-secondary pt-1 border-t border-surface-border font-bold">
                  <span>Total Spending Contribution:</span>
                  <span className="text-persona-red">{formatRupiah(memberDetail.totalSpending)}</span>
                </div>
              )}
            </div>

            {/* Activity History from Real Database */}
            {loadingDetail ? (
              <div className="h-20 flex items-center justify-center text-text-secondary font-mono text-xs gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-persona-red" />
                <span>Loading activity history...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Recent Sessions */}
                <div className="p-3 bg-surface-muted border border-surface-border rounded-[8px] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-text-secondary uppercase text-[10px] font-mono">
                    <Clock className="w-3 h-3 text-p3r-blue" />
                    <span>Recent Sessions ({memberDetail?.sessions?.length || 0})</span>
                  </div>
                  {memberDetail?.sessions && memberDetail.sessions.length > 0 ? (
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {memberDetail.sessions.map((s) => (
                        <div key={s.id} className="flex justify-between p-1.5 bg-surface rounded-[4px] border border-surface-border">
                          <div>
                            <span className="text-[#F2F3F5] font-bold block">{s.stationName} ({s.type})</span>
                            <span className="text-[10px] text-text-muted">{s.durationMinutes}m • {s.status}</span>
                          </div>
                          <span className="text-p3r-blue font-semibold">{formatRupiah(s.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-muted text-[11px] font-mono">No gaming sessions recorded</p>
                  )}
                </div>

                {/* Recent Transactions */}
                <div className="p-3 bg-surface-muted border border-surface-border rounded-[8px] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-text-secondary uppercase text-[10px] font-mono">
                    <Receipt className="w-3 h-3 text-persona-red" />
                    <span>Recent Transactions ({memberDetail?.transactions?.length || 0})</span>
                  </div>
                  {memberDetail?.transactions && memberDetail.transactions.length > 0 ? (
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {memberDetail.transactions.map((t) => (
                        <div key={t.id} className="flex justify-between p-1.5 bg-surface rounded-[4px] border border-surface-border">
                          <div>
                            <span className="text-[#F2F3F5] font-bold block">{t.invoiceNumber}</span>
                            <span className="text-[10px] text-text-muted">{t.type} • {t.status}</span>
                          </div>
                          <span className="text-[#F2F3F5] font-semibold">{formatRupiah(t.totalAmount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-muted text-[11px] font-mono">No transactions recorded</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-surface-border">
              <Link href={`/members/${selectedMember.id}/gaming`}>
                <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Buka Gaming Profile</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
