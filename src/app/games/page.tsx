"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GameItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import SharingAccountsPanel from "@/components/games/SharingAccountsPanel";
import { Modal } from "@/components/ui/Modal";
import {
  Gamepad2,
  Monitor,
  Search,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Cpu,
  PlayCircle,
  Tag,
  CheckCircle2,
  XCircle,
  Eye,
  SlidersHorizontal,
} from "lucide-react";

const GAME_COVERS: Record<string, string> = {
  "Counter-Strike 2": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/162664aa5da85f418105350c5d67ca565f6c3713/header.jpg",
  "Dota 2": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/570/header.jpg",
  "PUBG: BATTLEGROUNDS": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/578080/841ea38bc58cabb70aef65365cf50bc2d79329d9/header.jpg",
  "Apex Legends": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172470/60fcaedb88ccf94df30281533d828b86c6ffb9b6/header_alt_assets_5.jpg",
  "Rainbow Six Siege": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/359550/6b69a8d5ac8d0542bba5c735a8bcc5bb33cda42e/header_alt_assets_25.jpg",
  "EA Sports FC 24": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg",
  "Tekken 8": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1778820/c7b0b80639fc8c7d386922f414f293ca849e8e81/header.jpg",
  "ELDEN RING": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/f0b19c231f86fa0e633ff88a1a63459443017728/header_alt_assets_3.jpg",
  "Forza Horizon 5": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg",
  "The Witcher 3: Wild Hunt": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/e8afc4252e3fee8ed2525ab2fd7675cca39aa38d/header_alt_assets_1.jpg",
  "Warframe": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/230410/1a3e7c2a05ce4e5cad5ac4c7e858cf5b0934704e/header.jpg",
  "Destiny 2": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1085660/0ccf0dc0a8c4ec078db7ab99ddc820b2fa884441/header.jpg",
};

function gameCover(game: GameItem): string | null {
  if (game.bannerUrl) return game.bannerUrl;
  if (game.iconUrl) return game.iconUrl;
  return GAME_COVERS[game.title] || null;
}

function GameCover({ game }: { game: GameItem }) {
  const [hasImageError, setHasImageError] = useState(false);
  const cover = gameCover(game);

  if (!cover || hasImageError) {
    return (
      <div className="relative w-full h-32 bg-surface-muted flex items-center justify-center">
        <Gamepad2 className="w-12 h-12 text-surface-border" aria-hidden="true" />
        <span className="sr-only">Cover {game.title} tidak tersedia</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-32 bg-surface-muted">
      <img
        src={cover}
        alt={game.title}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setHasImageError(true)}
      />
    </div>
  );
}

export default function GameLibraryPage() {
  const router = useRouter();
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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);

  // Fetch games from real API
  const fetchGames = useCallback(async () => {
    try {
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (platformFilter !== "ALL") params.set("platform", platformFilter);
      if (genreFilter !== "ALL") params.set("genre", genreFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/games?${params.toString()}`, { credentials: "same-origin" });
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

  const handleOpenDetail = (game: GameItem) => {
    setSelectedGame(game);
    setDetailModalOpen(true);
  };

  const handleDelete = async (game: GameItem) => {
    const isDeactivate = (game.totalSessions || 0) > 0;
    const confirmMsg = isDeactivate
      ? `Game '${game.title}' memiliki riwayat sesi bermain. Nonaktifkan game dari katalog?`
      : `Hapus game '${game.title}' dari pustaka selamanya?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/games/${game.id}`, { method: "DELETE", credentials: "same-origin" });
      const json = await res.json();
      if (res.status === 401) {
        router.replace("/login");
        throw new Error("Sesi login tidak valid. Silakan masuk kembali.");
      }
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
            <div className="w-1.5 h-5 bg-orange rounded-[1px]"></div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">
              Game Library
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1 font-medium">
            Katalog game terpasang dan platform support di DREAMCAFÉ
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
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-maroon-subtle border border-maroon-border rounded-lg flex items-center justify-between text-sm text-maroon">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-card border border-surface-border p-4 rounded-[6px]">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-sm font-semibold">Total Games</span>
            <Gamepad2 className="w-4 h-4 text-text-secondary" />
          </div>
          <div className="text-2xl font-bold text-text-primary font-mono">{isLoading || errorMessage ? "—" : totalCount}</div>
          <div className="text-xs text-text-secondary mt-1 font-medium">Semua judul</div>
        </div>

        <div className="bg-surface-card border border-surface-border p-4 rounded-[6px]">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-sm font-semibold">PC Games</span>
            <Monitor className="w-4 h-4 text-persona-blue" />
          </div>
          <div className="text-2xl font-bold text-persona-blue font-mono">{isLoading || errorMessage ? "—" : pcCount}</div>
          <div className="text-xs text-text-secondary mt-1 font-medium">Di PC Stations</div>
        </div>

        <div className="bg-surface-card border border-surface-border p-4 rounded-[6px]">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-sm font-semibold">Console Games</span>
            <Gamepad2 className="w-4 h-4 text-orange" />
          </div>
          <div className="text-2xl font-bold text-orange font-mono">{isLoading || errorMessage ? "—" : consoleCount}</div>
          <div className="text-xs text-text-secondary mt-1 font-medium">PS5 / Switch</div>
        </div>

        <div className="bg-surface-card border border-surface-border p-4 rounded-[6px]">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-sm font-semibold">Aktif</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{isLoading || errorMessage ? "—" : activeCount}</div>
          <div className="text-xs text-text-secondary mt-1 font-medium">Siap main</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-surface-card border border-surface-border p-4 rounded-[6px] space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Cari judul game, publisher, genre, atau tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface-dark border border-surface-border rounded-[6px] text-text-primary placeholder-text-secondary focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/20"
            />
          </div>

          {/* Platform Filters */}
          <div className="flex gap-1 bg-surface-dark border border-surface-border p-1 rounded-[6px] shrink-0">
            {(["ALL", "PC", "CONSOLE"] as const).map((plat) => (
              <button
                key={plat}
                onClick={() => setPlatformFilter(plat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors ${
                  platformFilter === plat
                    ? "bg-orange text-white"
                    : "text-text-secondary hover:text-orange hover:bg-orange-subtle"
                }`}
              >
                {plat === "ALL" ? "Semua" : plat}
              </button>
            ))}
          </div>

          {/* Genre select */}
          <div className="w-full md:w-48 shrink-0">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-dark border border-surface-border rounded-[6px] text-text-primary focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/20"
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
          <div className="w-full md:w-40 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
              className="w-full px-3 py-2 text-sm bg-surface-dark border border-surface-border rounded-[6px] text-text-primary focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/20"
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
        <div className="p-16 text-center bg-surface-card border border-surface-border rounded-[6px]">
          <RefreshCw className="w-7 h-7 animate-spin text-orange mx-auto mb-3" />
          <p className="text-sm text-text-secondary font-medium">Memuat pustaka game dari Supabase...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="p-16 text-center bg-surface-card border border-surface-border rounded-[6px]">
          <Gamepad2 className="w-9 h-9 text-text-secondary mx-auto mb-3" />
          <h3 className="text-lg font-bold text-text-primary">Tidak Ada Game Ditemukan</h3>
          <p className="text-sm text-text-secondary mt-2 font-medium">
            {searchQuery || platformFilter !== "ALL" || genreFilter !== "ALL"
              ? "Coba ubah kata kunci pencarian atau reset filter platform/genre."
              : "Belum ada data game di database."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {games.map((game) => {

            return (
              <div
                key={game.id}
                className="bg-surface-card border border-surface-border hover:border-surface-border-active transition-colors rounded-[4px] flex flex-col justify-between overflow-hidden"
              >
                {/* Game Cover Image */}
                <GameCover game={game} />

                <div className="p-4">
                  <div>
                    {/* Top Bar: Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono px-2 py-1 bg-surface-dark border border-surface-border rounded text-text-secondary uppercase font-semibold">
                        {game.genre}
                      </span>
                      {game.isInstalledOnPc && (
                        <span className="text-xs font-mono px-2 py-1 bg-persona-blue/15 text-persona-blue border border-persona-blue/30 rounded font-semibold">
                          PC
                        </span>
                      )}
                      {game.isInstalledConsole && (
                        <span className="text-xs font-mono px-2 py-1 bg-orange/15 text-orange border border-orange-border/30 rounded font-semibold">
                          CONSOLE
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-xs font-mono font-semibold px-2.5 py-1 rounded border status-transition ${
                        game.isActive
                          ? "bg-sage-subtle text-sage border-sage-border"
                          : "bg-surface-muted text-text-secondary border-surface-border"
                      }`}
                    >
                      {game.isActive ? "AKTIF" : "OFF"}
                    </span>
                  </div>

                  {/* Title & Publisher */}
                  <h3 className="text-base font-bold text-text-primary tracking-wide mt-1">
                    {game.title}
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5 font-medium">
                    {game.publisher}
                  </p>

                  {/* System & Hardware specs */}
                  <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                    <div>
                      <span className="text-text-secondary flex items-center gap-1 text-xs font-semibold">
                        <Cpu className="w-3.5 h-3.5" /> Min. GPU
                      </span>
                      <span className="font-mono text-text-primary font-semibold mt-0.5 block">
                        {game.minGpuRequired}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {game.tags && game.tags.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                      {game.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-xs font-mono px-1 py-0.5 bg-surface-dark text-text-muted rounded-[2px]"
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
                    className="text-sm text-text-secondary hover:text-orange flex items-center gap-1 font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Detail</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDelete(game)}
                      className="p-1.5 text-text-secondary hover:text-maroon hover:bg-surface-dark rounded transition-colors"
                      title="Hapus / Nonaktifkan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
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
                <span className="text-text-muted block text-xs">Min. GPU Specification</span>
                <span className="font-mono text-text-primary font-medium mt-0.5 block">
                  {selectedGame.minGpuRequired}
                </span>
              </div>

              <div className="p-2.5 bg-surface-dark border border-surface-border rounded">
                <span className="text-text-muted block text-xs">Platform Compatibility</span>
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
                      className="text-xs font-mono px-2 py-0.5 bg-surface-dark border border-surface-border text-text-secondary rounded"
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

            <SharingAccountsPanel gameId={selectedGame.id} gameTitle={selectedGame.title} />
          </div>
        )}
      </Modal>
    </div>
  );
}
