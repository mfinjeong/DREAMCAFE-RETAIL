"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GameItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import {
  Gamepad2,
  Monitor,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Cpu,
  Clock,
  PlayCircle,
  Tag,
  CheckCircle2,
  XCircle,
  Eye,
  SlidersHorizontal,
} from "lucide-react";

export default function GameLibraryPage() {
  const [games, setGames] = useState<GameItem[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"ALL" | "PC" | "CONSOLE">("ALL");
  const [genreFilter, setGenreFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [gameForm, setGameForm] = useState({
    title: "",
    genre: "",
    publisher: "",
    minGpuRequired: "GTX 1650",
    popularityRank: 1,
    isInstalledOnPc: true,
    isInstalledConsole: false,
    isActive: true,
    tagsString: "",
    description: "",
  });

  // Fetch games from real API
  const fetchGames = useCallback(async () => {
    try {
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (platformFilter !== "ALL") params.set("platform", platformFilter);
      if (genreFilter !== "ALL") params.set("genre", genreFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/games?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat katalog game");
      }

      setGames(json.data);
      if (json.meta?.genres) {
        setGenres(json.meta.genres);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Koneksi database gagal");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, platformFilter, genreFilter, statusFilter]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchGames();
  };

  const handleOpenCreate = () => {
    setFormError(null);
    setGameForm({
      title: "",
      genre: genres[0] || "FPS",
      publisher: "",
      minGpuRequired: "GTX 1650",
      popularityRank: games.length + 1,
      isInstalledOnPc: true,
      isInstalledConsole: false,
      isActive: true,
      tagsString: "",
      description: "",
    });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (game: GameItem) => {
    setFormError(null);
    setSelectedGame(game);
    setGameForm({
      title: game.title,
      genre: game.genre,
      publisher: game.publisher,
      minGpuRequired: game.minGpuRequired,
      popularityRank: game.popularityRank,
      isInstalledOnPc: game.isInstalledOnPc,
      isInstalledConsole: game.isInstalledConsole,
      isActive: game.isActive,
      tagsString: game.tags?.join(", ") || "",
      description: game.description || "",
    });
    setEditModalOpen(true);
  };

  const handleOpenDetail = (game: GameItem) => {
    setSelectedGame(game);
    setDetailModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const tags = gameForm.tagsString
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: gameForm.title.trim(),
        genre: gameForm.genre.trim(),
        publisher: gameForm.publisher.trim(),
        minGpuRequired: gameForm.minGpuRequired.trim(),
        popularityRank: Number(gameForm.popularityRank) || 1,
        isInstalledOnPc: Boolean(gameForm.isInstalledOnPc),
        isInstalledConsole: Boolean(gameForm.isInstalledConsole),
        isActive: Boolean(gameForm.isActive),
        tags,
        description: gameForm.description.trim() || undefined,
      };

      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat game baru");
      }

      setCreateModalOpen(false);
      fetchGames();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan pengisian form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const tags = gameForm.tagsString
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: gameForm.title.trim(),
        genre: gameForm.genre.trim(),
        publisher: gameForm.publisher.trim(),
        minGpuRequired: gameForm.minGpuRequired.trim(),
        popularityRank: Number(gameForm.popularityRank) || 1,
        isInstalledOnPc: Boolean(gameForm.isInstalledOnPc),
        isInstalledConsole: Boolean(gameForm.isInstalledConsole),
        isActive: Boolean(gameForm.isActive),
        tags,
        description: gameForm.description.trim() || undefined,
      };

      const res = await fetch(`/api/games/${selectedGame.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memperbarui game");
      }

      setEditModalOpen(false);
      fetchGames();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan perubahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (game: GameItem) => {
    const isDeactivate = (game.totalSessions || 0) > 0;
    const confirmMsg = isDeactivate
      ? `Game '${game.title}' memiliki riwayat sesi bermain. Nonaktifkan game dari katalog?`
      : `Hapus game '${game.title}' dari pustaka selamanya?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memproses aksi hapus");
      }
      fetchGames();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus game");
    }
  };

  // Metrics summary
  const totalCount = games.length;
  const pcCount = games.filter((g) => g.isInstalledOnPc).length;
  const consoleCount = games.filter((g) => g.isInstalledConsole).length;
  const activeCount = games.filter((g) => g.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-persona-red persona-slash rounded-[1px]"></div>
            <h1 className="text-xl font-black tracking-wider text-text-primary uppercase">
              Game Library & Station Compatibility
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Katalog game terpasang, platform support, dan histori durasi bermain di DREAMCAFÉ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync DB</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Game</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-persona-red-subtle border border-persona-red-border rounded-[4px] flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-persona-red shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-card border border-surface-border p-3.5 rounded-[4px]">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Total Games</span>
            <Gamepad2 className="w-3.5 h-3.5 text-text-secondary" />
          </div>
          <div className="text-lg font-bold text-text-primary font-mono">{totalCount}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Semua judul terdaftar</div>
        </div>

        <div className="bg-surface-card border border-surface-border p-3.5 rounded-[4px]">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">PC Games</span>
            <Monitor className="w-3.5 h-3.5 text-persona-blue" />
          </div>
          <div className="text-lg font-bold text-persona-blue font-mono">{pcCount}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Tersedia di PC Stations</div>
        </div>

        <div className="bg-surface-card border border-surface-border p-3.5 rounded-[4px]">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Console Games</span>
            <Gamepad2 className="w-3.5 h-3.5 text-persona-red" />
          </div>
          <div className="text-lg font-bold text-persona-red font-mono">{consoleCount}</div>
          <div className="text-[10px] text-text-muted mt-0.5">PS5 / Nintendo Switch</div>
        </div>

        <div className="bg-surface-card border border-surface-border p-3.5 rounded-[4px]">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Aktif</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 font-mono">{activeCount}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Siap dimainkan</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-surface-card border border-surface-border p-3 rounded-[4px] space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari judul game, publisher, genre, atau tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-dark border border-surface-border rounded-[4px] text-text-primary focus:outline-none focus:border-persona-red"
            />
          </div>

          {/* Platform Filters */}
          <div className="flex gap-1 bg-surface-dark border border-surface-border p-0.5 rounded-[4px] shrink-0">
            {(["ALL", "PC", "CONSOLE"] as const).map((plat) => (
              <button
                key={plat}
                onClick={() => setPlatformFilter(plat)}
                className={`px-3 py-1 text-[11px] font-medium rounded-[3px] transition-colors ${
                  platformFilter === plat
                    ? "bg-persona-red text-white"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                {plat === "ALL" ? "Semua Platform" : plat}
              </button>
            ))}
          </div>

          {/* Genre select */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-dark border border-surface-border rounded-[4px] text-text-primary focus:outline-none focus:border-persona-red"
            >
              <option value="ALL">Semua Genre</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Status select */}
          <div className="w-full md:w-36 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-dark border border-surface-border rounded-[4px] text-text-primary focus:outline-none focus:border-persona-red"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Game Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center bg-surface-card border border-surface-border rounded-[4px]">
          <RefreshCw className="w-6 h-6 animate-spin text-persona-red mx-auto mb-2" />
          <p className="text-xs text-text-secondary font-mono">Memuat pustaka game dari Supabase...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="p-12 text-center bg-surface-card border border-surface-border rounded-[4px]">
          <Gamepad2 className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <h3 className="text-sm font-bold text-text-primary">Tidak Ada Game Ditemukan</h3>
          <p className="text-xs text-text-secondary mt-1">
            {searchQuery || platformFilter !== "ALL" || genreFilter !== "ALL"
              ? "Coba ubah kata kunci pencarian atau reset filter platform/genre."
              : "Belum ada data game di database. Klik tombol 'Tambah Game' untuk mendaftarkan game baru."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {games.map((game) => {
            const playHours = Math.round(((game.totalPlayMinutes || 0) / 60) * 10) / 10;

            return (
              <div
                key={game.id}
                className="bg-surface-card border border-surface-border hover:border-surface-border-active transition-colors p-4 rounded-[4px] flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-surface-dark border border-surface-border rounded text-text-secondary uppercase">
                        {game.genre}
                      </span>
                      {game.isInstalledOnPc && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-persona-blue/15 text-persona-blue border border-persona-blue/30 rounded">
                          PC
                        </span>
                      )}
                      {game.isInstalledConsole && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-persona-red/15 text-persona-red border border-persona-red/30 rounded">
                          CONSOLE
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        game.isActive
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      {game.isActive ? "AKTIF" : "OFF"}
                    </span>
                  </div>

                  {/* Title & Publisher */}
                  <h3 className="text-sm font-bold text-text-primary tracking-wide">
                    {game.title}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {game.publisher}
                  </p>

                  {/* System & Hardware specs */}
                  <div className="mt-3 pt-3 border-t border-surface-border grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-text-muted flex items-center gap-1 text-[10px]">
                        <Cpu className="w-3 h-3" /> Min. GPU
                      </span>
                      <span className="font-mono text-text-secondary font-medium">
                        {game.minGpuRequired}
                      </span>
                    </div>

                    <div>
                      <span className="text-text-muted flex items-center gap-1 text-[10px]">
                        <Clock className="w-3 h-3" /> Total Durasi
                      </span>
                      <span className="font-mono text-text-secondary font-medium">
                        {playHours} Jam ({game.totalSessions || 0} sesi)
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {game.tags && game.tags.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                      {game.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-mono px-1 py-0.5 bg-surface-dark text-text-muted rounded-[2px]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action buttons */}
                <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDetail(game)}
                    className="text-[11px] text-text-muted hover:text-white flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Detail</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(game)}
                      className="p-1.5 text-text-muted hover:text-persona-blue hover:bg-surface-dark rounded transition-colors"
                      title="Edit Game"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(game)}
                      className="p-1.5 text-text-muted hover:text-persona-red hover:bg-surface-dark rounded transition-colors"
                      title="Hapus / Nonaktifkan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="TAMBAH GAME KE PUSTAKA"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded text-xs text-white">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Judul Game <span className="text-persona-red">*</span>
              </label>
              <Input
                required
                placeholder="e.g. EA Sports FC 25"
                value={gameForm.title}
                onChange={(e) => setGameForm({ ...gameForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Publisher <span className="text-persona-red">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Electronic Arts"
                value={gameForm.publisher}
                onChange={(e) => setGameForm({ ...gameForm, publisher: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Genre <span className="text-persona-red">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Tactical FPS, MOBA, Fighting"
                value={gameForm.genre}
                onChange={(e) => setGameForm({ ...gameForm, genre: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Min. GPU Requirement
              </label>
              <Input
                placeholder="e.g. GTX 1650, RTX 3060"
                value={gameForm.minGpuRequired}
                onChange={(e) => setGameForm({ ...gameForm, minGpuRequired: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Tags (Pisahkan dengan koma)
            </label>
            <Input
              placeholder="e.g. Shooter, Controller, Multiplayer"
              value={gameForm.tagsString}
              onChange={(e) => setGameForm({ ...gameForm, tagsString: e.target.value })}
            />
          </div>

          {/* Platform Installation Checkboxes */}
          <div className="p-3 bg-surface-dark border border-surface-border rounded-[4px] space-y-2">
            <span className="text-xs font-medium text-text-secondary block">
              Kompatibilitas Station DREAMCAFÉ:
            </span>
            <div className="flex items-center gap-6 text-xs text-text-primary">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gameForm.isInstalledOnPc}
                  onChange={(e) =>
                    setGameForm({ ...gameForm, isInstalledOnPc: e.target.checked })
                  }
                  className="rounded border-surface-border bg-surface-card text-persona-red focus:ring-0"
                />
                <span>Terpasang di PC Stations</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gameForm.isInstalledConsole}
                  onChange={(e) =>
                    setGameForm({ ...gameForm, isInstalledConsole: e.target.checked })
                  }
                  className="rounded border-surface-border bg-surface-card text-persona-red focus:ring-0"
                />
                <span>Terpasang di Console Stations (PS5/Switch)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Game"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`EDIT GAME: ${selectedGame?.title || ""}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded text-xs text-white">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Judul Game <span className="text-persona-red">*</span>
              </label>
              <Input
                required
                value={gameForm.title}
                onChange={(e) => setGameForm({ ...gameForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Publisher <span className="text-persona-red">*</span>
              </label>
              <Input
                required
                value={gameForm.publisher}
                onChange={(e) => setGameForm({ ...gameForm, publisher: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Genre <span className="text-persona-red">*</span>
              </label>
              <Input
                required
                value={gameForm.genre}
                onChange={(e) => setGameForm({ ...gameForm, genre: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Min. GPU Requirement
              </label>
              <Input
                value={gameForm.minGpuRequired}
                onChange={(e) => setGameForm({ ...gameForm, minGpuRequired: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Tags (Pisahkan dengan koma)
            </label>
            <Input
              value={gameForm.tagsString}
              onChange={(e) => setGameForm({ ...gameForm, tagsString: e.target.value })}
            />
          </div>

          <div className="p-3 bg-surface-dark border border-surface-border rounded-[4px] space-y-2">
            <span className="text-xs font-medium text-text-secondary block">
              Pengaturan Status & Kompatibilitas:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-text-primary">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gameForm.isInstalledOnPc}
                  onChange={(e) =>
                    setGameForm({ ...gameForm, isInstalledOnPc: e.target.checked })
                  }
                  className="rounded border-surface-border bg-surface-card text-persona-red focus:ring-0"
                />
                <span>Support PC</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gameForm.isInstalledConsole}
                  onChange={(e) =>
                    setGameForm({ ...gameForm, isInstalledConsole: e.target.checked })
                  }
                  className="rounded border-surface-border bg-surface-card text-persona-red focus:ring-0"
                />
                <span>Support Console</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gameForm.isActive}
                  onChange={(e) =>
                    setGameForm({ ...gameForm, isActive: e.target.checked })
                  }
                  className="rounded border-surface-border bg-surface-card text-persona-red focus:ring-0"
                />
                <span>Status Aktif</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="INFORMASI GAME"
      >
        {selectedGame && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-dark border border-surface-border rounded-[4px]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    {selectedGame.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selectedGame.publisher} • {selectedGame.genre}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    selectedGame.isActive
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {selectedGame.isActive ? "STATUS: AKTIF" : "STATUS: NONAKTIF"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-surface-dark border border-surface-border rounded">
                <span className="text-text-muted block text-[10px]">Min. GPU Specification</span>
                <span className="font-mono text-text-primary font-medium mt-0.5 block">
                  {selectedGame.minGpuRequired}
                </span>
              </div>

              <div className="p-2.5 bg-surface-dark border border-surface-border rounded">
                <span className="text-text-muted block text-[10px]">Platform Compatibility</span>
                <span className="font-mono text-text-primary font-medium mt-0.5 block">
                  {selectedGame.isInstalledOnPc && selectedGame.isInstalledConsole
                    ? "PC & CONSOLE"
                    : selectedGame.isInstalledOnPc
                    ? "PC ONLY"
                    : selectedGame.isInstalledConsole
                    ? "CONSOLE ONLY"
                    : "BELUM TERPASANG"}
                </span>
              </div>

              <div className="p-2.5 bg-surface-dark border border-surface-border rounded">
                <span className="text-text-muted block text-[10px]">Total Sesi Bermain</span>
                <span className="font-mono text-text-primary font-medium mt-0.5 block">
                  {selectedGame.totalSessions || 0} Sesi
                </span>
              </div>

              <div className="p-2.5 bg-surface-dark border border-surface-border rounded">
                <span className="text-text-muted block text-[10px]">Total Akumulasi Durasi</span>
                <span className="font-mono text-text-primary font-medium mt-0.5 block">
                  {Math.round(((selectedGame.totalPlayMinutes || 0) / 60) * 10) / 10} Jam (
                  {selectedGame.totalPlayMinutes || 0} Menit)
                </span>
              </div>
            </div>

            {selectedGame.tags && selectedGame.tags.length > 0 && (
              <div>
                <span className="text-[11px] text-text-muted block mb-1.5 font-medium">
                  Tags & Klasifikasi:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedGame.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-mono px-2 py-0.5 bg-surface-dark border border-surface-border text-text-secondary rounded"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
