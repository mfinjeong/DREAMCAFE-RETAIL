import { prisma } from "@/lib/prisma";
import { MemberTier, SessionStatus } from "@prisma/client";
import { GamingProfileDTO, MemberGameStatItem, GamingActivityItem } from "@/lib/types";

/**
 * Calculates member level from total XP based on progressive threshold formula:
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 250 XP
 * Level 4: 450 XP
 * Level 5: 700 XP
 * Level L (L >= 2): 25 * (L - 1) * (L + 2)
 */
export function calculateLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  // Solving 25 * (L^2 + L - 2) <= xp:
  const val = 1 + 4 * (2 + xp / 25);
  const level = Math.floor((-1 + Math.sqrt(val)) / 2);
  return Math.max(1, level);
}

/**
 * Total XP required to reach the given level.
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}

/**
 * Total XP required to reach the next level (level + 1).
 */
export function calculateXPForNextLevel(level: number): number {
  return calculateXPForLevel(level + 1);
}

/**
 * Server-authoritative session XP rule:
 * 10 XP per completed 30 minutes of session play.
 */
export function calculateSessionXP(durationMinutes: number): number {
  if (durationMinutes < 30) return 0;
  return Math.floor(durationMinutes / 30) * 10;
}

/**
 * Server-authoritative session completion processor.
 * Awards XP to member and increments MemberGameStat for the played game.
 * Guarantees idempotency (prevents duplicate XP awards if called multiple times).
 */
export async function recordSessionCompletion(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      member: true,
      game: true,
    },
  });

  if (!session) {
    throw new Error("Sesi tidak ditemukan");
  }

  // Idempotency: Prevent duplicate XP award if already processed
  if (session.isXpAwarded) {
    return {
      awarded: false,
      xpEarned: 0,
      reason: "XP sudah pernah diberikan untuk sesi ini",
    };
  }

  const durationMinutes = session.durationMinutes || 0;
  const xpEarned = calculateSessionXP(durationMinutes);

  return await prisma.$transaction(async (tx) => {
    // 1. Mark session XP as awarded
    await tx.session.update({
      where: { id: sessionId },
      data: { isXpAwarded: true },
    });

    // 2. If session had a registered member, award XP & recalculate level
    if (session.memberId) {
      const currentMember = await tx.member.findUnique({
        where: { id: session.memberId },
      });

      if (currentMember) {
        const newTotalXP = currentMember.xp + xpEarned;
        const newLevel = calculateLevelFromXP(newTotalXP);
        const dreamCoinsEarned = Math.floor(xpEarned / 10);

        // Update Member level, xp, and dream coins
        await tx.member.update({
          where: { id: session.memberId },
          data: {
            xp: newTotalXP,
            level: newLevel,
            dreamCoins: { increment: dreamCoinsEarned },
          },
        });

        // 3. If session had an associated game, update MemberGameStat
        if (session.gameId) {
          await tx.memberGameStat.upsert({
            where: {
              memberId_gameId: {
                memberId: session.memberId,
                gameId: session.gameId,
              },
            },
            update: {
              totalSessions: { increment: 1 },
              totalPlayMinutes: { increment: durationMinutes },
              xp: { increment: xpEarned },
              lastPlayedAt: new Date(),
            },
            create: {
              memberId: session.memberId,
              gameId: session.gameId,
              totalSessions: 1,
              totalPlayMinutes: durationMinutes,
              xp: xpEarned,
              lastPlayedAt: new Date(),
            },
          });
        }
      }
    }

    return {
      awarded: true,
      xpEarned,
      memberId: session.memberId,
      gameId: session.gameId,
    };
  });
}

/**
 * Retrieves the comprehensive Gaming Profile for a member.
 */
export async function getGamingProfile(memberId: string): Promise<GamingProfileDTO> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      gameStats: {
        include: {
          game: true,
        },
        orderBy: {
          totalPlayMinutes: "desc",
        },
      },
    },
  });

  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  // Fetch recent sessions for this member
  const recentSessions = await prisma.session.findMany({
    where: { memberId },
    orderBy: { startTime: "desc" },
    take: 10,
    include: {
      pc: true,
      console: true,
      game: true,
    },
  });

  // Calculate totals
  const totalSessions = member.gameStats.reduce((acc, s) => acc + s.totalSessions, 0);
  const totalPlayMinutes = member.gameStats.reduce((acc, s) => acc + s.totalPlayMinutes, 0);
  const totalPlayHours = Math.round((totalPlayMinutes / 60) * 10) / 10;

  // Level & XP progression
  const currentLevel = member.level || calculateLevelFromXP(member.xp);
  const xpForCurrentLevel = calculateXPForLevel(currentLevel);
  const xpForNextLevel = calculateXPForNextLevel(currentLevel);
  const rangeXP = Math.max(1, xpForNextLevel - xpForCurrentLevel);
  const progressXP = Math.max(0, member.xp - xpForCurrentLevel);
  const progressPercent = Math.min(100, Math.max(0, Math.round((progressXP / rangeXP) * 100)));
  const xpRemaining = Math.max(0, xpForNextLevel - member.xp);

  // Format game stats list
  const gamesPlayed: MemberGameStatItem[] = member.gameStats.map((stat) => ({
    id: stat.id,
    memberId: stat.memberId,
    gameId: stat.gameId,
    gameTitle: stat.game.title,
    gameGenre: stat.game.genre,
    gameIconUrl: stat.game.iconUrl,
    totalSessions: stat.totalSessions,
    totalPlayMinutes: stat.totalPlayMinutes,
    totalPlayHours: Math.round((stat.totalPlayMinutes / 60) * 10) / 10,
    wins: stat.wins,
    losses: stat.losses,
    xp: stat.xp,
    lastPlayedAt: stat.lastPlayedAt?.toISOString() || null,
    createdAt: stat.createdAt.toISOString(),
    updatedAt: stat.updatedAt.toISOString(),
  }));

  // Favorite games are the top 3 by playtime
  const favoriteGames = gamesPlayed.slice(0, 3);

  // Format recent activity
  const recentActivity: GamingActivityItem[] = recentSessions.map((s) => {
    const stationNumber = s.pc ? s.pc.stationNumber : s.console ? s.console.stationNumber : "-";
    const sessionDuration = s.durationMinutes || 0;
    const earned = s.isXpAwarded ? calculateSessionXP(sessionDuration) : 0;

    return {
      id: s.id,
      sessionNumber: s.sessionNumber,
      gameId: s.gameId,
      gameTitle: s.game?.title || s.notes || "Free Play",
      stationType: s.type,
      stationNumber,
      durationMinutes: sessionDuration,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() || null,
      status: s.status,
      xpEarned: earned,
    };
  });

  return {
    member: {
      id: member.id,
      memberCode: member.memberCode,
      fullName: member.fullName,
      username: member.username,
      tier: member.tier as MemberTier,
      avatarUrl: member.avatarUrl,
      dreamCoins: member.dreamCoins,
      xp: member.xp,
      level: currentLevel,
      createdAt: member.createdAt.toISOString(),
    },
    stats: {
      totalSessions,
      totalPlayMinutes,
      totalPlayHours,
      xpForCurrentLevel,
      xpForNextLevel,
      progressPercent,
      xpRemaining,
    },
    favoriteGames,
    gamesPlayed,
    recentActivity,
  };
}

/**
 * Returns game stats for a specific member.
 */
export async function getMemberGameStats(memberId: string): Promise<MemberGameStatItem[]> {
  const stats = await prisma.memberGameStat.findMany({
    where: { memberId },
    include: {
      game: true,
    },
    orderBy: {
      totalPlayMinutes: "desc",
    },
  });

  return stats.map((stat) => ({
    id: stat.id,
    memberId: stat.memberId,
    gameId: stat.gameId,
    gameTitle: stat.game.title,
    gameGenre: stat.game.genre,
    gameIconUrl: stat.game.iconUrl,
    totalSessions: stat.totalSessions,
    totalPlayMinutes: stat.totalPlayMinutes,
    totalPlayHours: Math.round((stat.totalPlayMinutes / 60) * 10) / 10,
    wins: stat.wins,
    losses: stat.losses,
    xp: stat.xp,
    lastPlayedAt: stat.lastPlayedAt?.toISOString() || null,
    createdAt: stat.createdAt.toISOString(),
    updatedAt: stat.updatedAt.toISOString(),
  }));
}
