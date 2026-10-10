import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { gameSchema, updateGameSchema } from "@/lib/validators";
import { GameItem } from "@/lib/types";

export interface GameListFilters {
  q?: string;
  platform?: "ALL" | "PC" | "CONSOLE";
  genre?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
}

/**
 * Lists games with database filtering, search, and platform filtering.
 */
export async function listGames(filters: GameListFilters = {}): Promise<GameItem[]> {
  const where: Prisma.GameWhereInput = {};

  // Status filter
  if (filters.status === "ACTIVE") {
    where.isActive = true;
  } else if (filters.status === "INACTIVE") {
    where.isActive = false;
  }

  // Platform filter
  if (filters.platform === "PC") {
    where.isInstalledOnPc = true;
  } else if (filters.platform === "CONSOLE") {
    where.isInstalledConsole = true;
  }

  // Genre filter
  if (filters.genre && filters.genre !== "ALL") {
    where.genre = { equals: filters.genre, mode: "insensitive" };
  }

  // Search query across title, genre, publisher, tags
  if (filters.q && filters.q.trim()) {
    const query = filters.q.trim();
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { genre: { contains: query, mode: "insensitive" } },
      { publisher: { contains: query, mode: "insensitive" } },
      { tags: { has: query } },
    ];
  }

  const games = await prisma.game.findMany({
    where,
    orderBy: [
      { popularityRank: "asc" },
      { title: "asc" },
    ],
    include: {
      memberStats: true,
      _count: {
        select: { sessions: true },
      },
    },
  });

  return games.map((g) => {
    const totalPlayMinutes = g.memberStats.reduce((sum, s) => sum + s.totalPlayMinutes, 0);

    return {
      id: g.id,
      title: g.title,
      slug: g.slug,
      genre: g.genre,
      publisher: g.publisher,
      iconUrl: g.iconUrl,
      bannerUrl: g.bannerUrl,
      description: g.description,
      minGpuRequired: g.minGpuRequired,
      popularityRank: g.popularityRank,
      isInstalledOnPc: g.isInstalledOnPc,
      isInstalledConsole: g.isInstalledConsole,
      isActive: g.isActive,
      tags: g.tags,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
      totalSessions: g._count.sessions,
      totalPlayMinutes,
    };
  });
}

/**
 * Retrieves a single game by ID.
 */
export async function getGameById(id: string): Promise<GameItem | null> {
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      memberStats: true,
      _count: {
        select: { sessions: true },
      },
    },
  });

  if (!game) return null;

  const totalPlayMinutes = game.memberStats.reduce((sum, s) => sum + s.totalPlayMinutes, 0);

  return {
    id: game.id,
    title: game.title,
    slug: game.slug,
    genre: game.genre,
    publisher: game.publisher,
    iconUrl: game.iconUrl,
    bannerUrl: game.bannerUrl,
    description: game.description,
    minGpuRequired: game.minGpuRequired,
    popularityRank: game.popularityRank,
    isInstalledOnPc: game.isInstalledOnPc,
    isInstalledConsole: game.isInstalledConsole,
    isActive: game.isActive,
    tags: game.tags,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    totalSessions: game._count.sessions,
    totalPlayMinutes,
  };
}

/**
 * Creates a new Game record with validation.
 */
export async function createGame(data: unknown): Promise<GameItem> {
  const validated = gameSchema.parse(data);

  // Check unique title
  const existing = await prisma.game.findUnique({
    where: { title: validated.title },
  });
  if (existing) {
    throw new Error(`Game '${validated.title}' sudah terdaftar dalam katalog`);
  }

  // Generate slug if not provided
  let slug = validated.slug;
  if (!slug) {
    slug = validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const created = await prisma.game.create({
    data: {
      title: validated.title,
      slug,
      genre: validated.genre,
      publisher: validated.publisher,
      iconUrl: validated.iconUrl || null,
      bannerUrl: validated.bannerUrl || null,
      description: validated.description || null,
      minGpuRequired: validated.minGpuRequired || "GTX 1650",
      popularityRank: validated.popularityRank || 1,
      isInstalledOnPc: validated.isInstalledOnPc ?? true,
      isInstalledConsole: validated.isInstalledConsole ?? false,
      isActive: validated.isActive ?? true,
      tags: validated.tags || [],
    },
  });

  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    totalSessions: 0,
    totalPlayMinutes: 0,
  };
}

/**
 * Updates an existing Game record.
 */
export async function updateGame(id: string, data: unknown): Promise<GameItem> {
  const existing = await prisma.game.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Game tidak ditemukan");
  }

  const validated = updateGameSchema.parse(data);

  // Check unique title collision if changing title
  if (validated.title && validated.title !== existing.title) {
    const dup = await prisma.game.findUnique({ where: { title: validated.title } });
    if (dup && dup.id !== id) {
      throw new Error(`Game dengan judul '${validated.title}' sudah ada`);
    }
  }

  const updated = await prisma.game.update({
    where: { id },
    data: {
      ...(validated.title !== undefined && { title: validated.title }),
      ...(validated.slug !== undefined && { slug: validated.slug }),
      ...(validated.genre !== undefined && { genre: validated.genre }),
      ...(validated.publisher !== undefined && { publisher: validated.publisher }),
      ...(validated.iconUrl !== undefined && { iconUrl: validated.iconUrl }),
      ...(validated.bannerUrl !== undefined && { bannerUrl: validated.bannerUrl }),
      ...(validated.description !== undefined && { description: validated.description }),
      ...(validated.minGpuRequired !== undefined && { minGpuRequired: validated.minGpuRequired }),
      ...(validated.popularityRank !== undefined && { popularityRank: validated.popularityRank }),
      ...(validated.isInstalledOnPc !== undefined && { isInstalledOnPc: validated.isInstalledOnPc }),
      ...(validated.isInstalledConsole !== undefined && { isInstalledConsole: validated.isInstalledConsole }),
      ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      ...(validated.tags !== undefined && { tags: validated.tags }),
    },
  });

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/**
 * Deactivates or deletes a game safely.
 */
export async function deleteGame(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
  const existing = await prisma.game.findUnique({
    where: { id },
    include: {
      sessions: { where: { status: "ACTIVE" } },
      _count: { select: { sessions: true, memberStats: true } },
    },
  });

  if (!existing) {
    throw new Error("Game tidak ditemukan");
  }

  // Prevent deleting game currently being played
  if (existing.sessions.length > 0) {
    throw new Error("Tidak dapat menghapus game yang sedang dimainkan di sesi aktif");
  }

  // If game has historical sessions or stats, soft-deactivate instead of breaking relations
  if (existing._count.sessions > 0 || existing._count.memberStats > 0) {
    await prisma.game.update({
      where: { id },
      data: { isActive: false },
    });
    return { deleted: false, deactivated: true };
  }

  await prisma.game.delete({ where: { id } });
  return { deleted: true, deactivated: false };
}

/**
 * Returns distinct genres currently in the catalog.
 */
export async function getGameGenres(): Promise<string[]> {
  const games = await prisma.game.findMany({
    select: { genre: true },
    distinct: ["genre"],
    orderBy: { genre: "asc" },
  });
  return games.map((g) => g.genre);
}
