"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { GamingProfileDTO } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import {
  Trophy,
  Coins,
  Clock,
  Gamepad2,
  Calendar,
  Monitor,
  Flame,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Star,
} from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

export default function MemberGamingProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const memberId = resolvedParams.id;

  const [profile, setProfile] = useState<GamingProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      setErrorMessage(null);
      const res = await fetch(`/api/members/${memberId}/gaming`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat profil gaming");
      }
      setProfile(json.data);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan server");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [memberId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProfile();
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center bg-surface-card border border-surface-border rounded-[4px]">
        <RefreshCw className="w-6 h-6 animate-spin text-persona-red mx-auto mb-2" />
        <p className="text-xs text-text-secondary font-mono">Memuat Gaming Profile member...</p>
      </div>
    );
  }

  if (errorMessage || !profile) {
    return (
      <div className="p-8 bg-surface-card border border-surface-border rounded-[4px] text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-persona-red mx-auto" />
        <div>
          <h2 className="text-sm font-bold text-text-primary">Profil Tidak Ditemukan</h2>
          <p className="text-xs text-text-secondary mt-1">{errorMessage || "Data member tidak tersedia."}</p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Link href="/members">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Member</span>
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={handleRefresh}>
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  const { member, stats, favoriteGames, gamesPlayed, recentActivity } = profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Manajemen Member</span>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Sync Data</span>
        </Button>
      </div>

      <div className="bg-surface-card border border-surface-border p-5 rounded-[4px] relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-persona-red/10 to-transparent pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[4px] bg-surface-dark border border-surface-border-active flex items-center justify-center text-xl font-black text-persona-red font-mono shrink-0">
              {member.username.slice(0, 2).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-black text-text-primary tracking-wide">
                  {member.username}
                </span>
                <span className="text-xs font-mono text-text-muted px-1.5 py-0.5 bg-surface-dark border border-surface-border rounded">
                  {member.memberCode}
                </span>
                <span className="text-xs font-mono text-persona-red font-bold px-2 py-0.5 bg-persona-red/10 border border-persona-red/30 rounded">
                  {member.tier}
                </span>
              </div>

              <p className="text-xs text-text-secondary mt-1">
                {member.fullName} • Member Sejak {member.createdAt.slice(0, 10)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-surface-border pt-3 md:pt-0 md:pl-5">
            <div className="text-right">
              <span className="text-[10px] font-mono text-text-muted block uppercase tracking-wider">
                DREAM Coins
              </span>
              <div className="flex items-center justify-end gap-1 text-sm font-bold text-amber-400 font-mono mt-0.5">
                <Coins className="w-4 h-4" />
                <span>{member.dreamCoins.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-text-muted block uppercase tracking-wider">
                Total XP
              </span>
              <div className="flex items-center justify-end gap-1 text-sm font-bold text-persona-blue font-mono mt-0.5">
                <Sparkles className="w-4 h-4" />
                <span>{member.xp.toLocaleString("id-ID")} XP</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-surface-border">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white px-2 py-0.5 bg-persona-red rounded-[2px] text-[11px]">
                LEVEL {member.level}
              </span>
              <span className="text-text-secondary text-[11px]">
                Progress Menuju Level {member.level + 1}
              </span>
            </div>

            <span className="font-mono text-text-muted text-[11px]">
              {member.xp.toLocaleString("id-ID")} / {stats.xpForNextLevel.toLocaleString("id-ID")} XP ({stats.progressPercent}%)
            </span>
          </div>

          <div className="w-full h-2 bg-surface-dark border border-surface-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-persona-red to-persona-blue transition-all duration-300"
              style={{ width: `${stats.progressPercent}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-[10px] text-text-muted font-mono mt-1">
            <span>Level {member.level} ({stats.xpForCurrentLevel} XP)</span>
            <span>Butuh {stats.xpRemaining.toLocaleString("id-ID")} XP lagi untuk Level Up</span>
            <span>Level {member.level + 1} ({stats.xpForNextLevel} XP)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-surface-border p-4 rounded-[4px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Total Sessions</span>
            <Clock className="w-4 h-4 text-persona-red" />
          </div>
          <div className="text-2xl font-black font-mono text-text-primary">{stats.totalSessions}</div>
          <p className="text-[10px] text-text-secondary mt-1">Sesi bermain tercatat</p>
        </div>

        <div className="bg-surface-card border border-surface-border p-4 rounded-[4px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Total Playtime</span>
            <Gamepad2 className="w-4 h-4 text-persona-blue" />
          </div>
          <div className="text-2xl font-black font-mono text-text-primary">{`${stats.totalPlayHours.toFixed(1)}h`}</div>
          <p className="text-[10px] text-text-secondary mt-1">Jam bermain kumulatif</p>
        </div>

        <div className="bg-surface-card border border-surface-border p-4 rounded-[4px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Games Played</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-text-primary">{gamesPlayed.length}</div>
          <p className="text-[10px] text-text-secondary mt-1">Game berbeda dimainkan</p>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border p-5 rounded-[4px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-3.5 bg-amber-400 persona-slash rounded-[1px]"></div>
          <h2 className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
            Favorite Games
          </h2>
        </div>

        {favoriteGames.length === 0 ? (
          <div className="p-8 text-center bg-surface-dark/40 border border-surface-border rounded-[4px]">
            <Gamepad2 className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-xs text-text-secondary font-mono">Belum ada game favorit.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {favoriteGames.map((fg) => (
              <div
                key={fg.id}
                className="bg-surface-dark/40 border border-surface-border p-3.5 rounded-[4px] hover:border-persona-red/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-text-primary">{fg.gameTitle}</h3>
                    <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                      {fg.gameGenre} • {""}
                    </p>
                  </div>
                  <Flame className="w-4 h-4 text-persona-red shrink-0" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-text-muted text-[10px] block">Sessions</span>
                    <span className="text-text-primary font-bold">{fg.totalSessions}</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px] block">Playtime</span>
                    <span className="text-text-primary font-bold">{`${fg.totalPlayHours.toFixed(1)}h`}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface-card border border-surface-border p-5 rounded-[4px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-3.5 bg-persona-blue persona-slash rounded-[1px]"></div>
          <h2 className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
            Recent Activity
          </h2>
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-8 text-center bg-surface-dark/40 border border-surface-border rounded-[4px]">
            <Calendar className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-xs text-text-secondary font-mono">Belum ada aktivitas sesi.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="bg-surface-dark/40 border border-surface-border p-3 rounded-[4px] hover:bg-surface-hover/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-surface-dark border border-surface-border flex items-center justify-center shrink-0">
                      {act.stationType === "PC" ? (
                        <Monitor className="w-4 h-4 text-persona-red" />
                      ) : (
                        <Gamepad2 className="w-4 h-4 text-persona-blue" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">{act.gameTitle || "Game Tidak Tercatat"}</span>
                        <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 bg-surface-dark border border-surface-border rounded">
                          {act.stationType} {act.stationNumber}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                        {formatDateTime(act.startTime)} • {`${act.durationMinutes} min`}
                      </p>
                    </div>
                  </div>

                  {act.xpEarned > 0 && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs font-bold text-persona-blue font-mono">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+{act.xpEarned} XP</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
