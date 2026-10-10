import { prisma } from "@/lib/prisma";
import { ConsoleStatus, ConsoleType, Prisma, SessionStatus } from "@prisma/client";
import { consoleSchema } from "@/lib/validators";
import { assertNoOpenTickets } from "@/services/maintenance.service";

export interface ConsoleFilterOptions {
  status?: string | null;
  consoleType?: string | null;
  search?: string | null;
}

export type ConsoleCreateInput = Prisma.ConsoleUncheckedCreateInput;
export type ConsoleUpdateInput = Prisma.ConsoleUncheckedUpdateInput;

export async function listConsoles(filters: ConsoleFilterOptions = {}) {
  const where: Prisma.ConsoleWhereInput = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as ConsoleStatus;
  }
  if (filters.consoleType && filters.consoleType !== "ALL") {
    where.consoleType = filters.consoleType as ConsoleType;
  }
  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { stationNumber: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { specsDisplay: { contains: q, mode: "insensitive" } },
    ];
  }

  const consoles = await prisma.console.findMany({
    where,
    orderBy: { stationNumber: "asc" },
    include: {
      sessions: {
        where: { status: SessionStatus.ACTIVE },
        include: {
          member: {
            select: {
              id: true,
              username: true,
              fullName: true,
              tier: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  return consoles.map((con) => {
    const active = con.sessions[0];
    return {
      id: con.id,
      stationNumber: con.stationNumber,
      name: con.name,
      consoleType: con.consoleType,
      status: con.status,
      hourlyRate: con.hourlyRate,
      controllersCount: con.controllersCount,
      installedGames: con.installedGames,
      specsDisplay: con.specsDisplay,
      currentGame: con.currentGame,
      createdAt: con.createdAt.toISOString(),
      updatedAt: con.updatedAt.toISOString(),
      activeSessionId: active ? active.id : null,
      activeSession: active
        ? {
            id: active.id,
            sessionNumber: active.sessionNumber,
            stationId: con.id,
            stationNumber: con.stationNumber,
            type: "CONSOLE" as const,
            memberId: active.memberId,
            memberName: active.member?.fullName || null,
            username: active.member?.username || null,
            guestName: active.guestName,
            startTime: active.startTime.toISOString(),
            durationMinutes: active.durationMinutes,
            remainingMinutes: active.remainingMinutes,
            hourlyRate: active.hourlyRate,
            totalPrice: active.totalPrice,
            status: active.status,
            paymentStatus: active.paymentStatus,
            currentGame: con.currentGame || null,
          }
        : null,
    };
  });
}

export async function getConsoleById(id: string) {
  const con = await prisma.console.findUnique({
    where: { id },
    include: {
      sessions: {
        where: { status: SessionStatus.ACTIVE },
        include: {
          member: true,
        },
        take: 1,
      },
      maintenances: {
        orderBy: { reportedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!con) return null;

  const active = con.sessions[0];
  return {
    ...con,
    createdAt: con.createdAt.toISOString(),
    updatedAt: con.updatedAt.toISOString(),
    activeSessionId: active ? active.id : null,
    activeSession: active
      ? {
          id: active.id,
          sessionNumber: active.sessionNumber,
          stationId: con.id,
          stationNumber: con.stationNumber,
          type: "CONSOLE" as const,
          memberId: active.memberId,
          memberName: active.member?.fullName || null,
          username: active.member?.username || null,
          guestName: active.guestName,
          startTime: active.startTime.toISOString(),
          durationMinutes: active.durationMinutes,
          remainingMinutes: active.remainingMinutes,
          hourlyRate: active.hourlyRate,
          totalPrice: active.totalPrice,
          status: active.status,
          paymentStatus: active.paymentStatus,
          currentGame: con.currentGame || null,
        }
      : null,
  };
}

export async function createConsole(data: ConsoleCreateInput) {
  // Validate input with Zod
  const validated = consoleSchema.parse(data);

  const existing = await prisma.console.findUnique({
    where: { stationNumber: validated.stationNumber },
  });

  if (existing) {
    throw new Error(`Nomor station konsol ${validated.stationNumber} sudah terdaftar`);
  }

  return await prisma.console.create({
    data: {
      stationNumber: validated.stationNumber,
      name: validated.name,
      consoleType: validated.consoleType as ConsoleType,
      status: (validated.status as ConsoleStatus) || ConsoleStatus.AVAILABLE,
      hourlyRate: validated.hourlyRate,
      controllersCount: validated.controllersCount,
      specsDisplay: validated.specsDisplay,
      installedGames: validated.installedGames || [],
    },
  });
}

export async function updateConsole(id: string, data: ConsoleUpdateInput) {
  const existing = await prisma.console.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Console Station tidak ditemukan");
  }

  // Validate partial input with Zod
  const validated = consoleSchema.partial().parse(data);

  if (validated.stationNumber && validated.stationNumber !== existing.stationNumber) {
    const duplicate = await prisma.console.findUnique({
      where: { stationNumber: validated.stationNumber },
    });
    if (duplicate) {
      throw new Error(`Nomor station ${validated.stationNumber} sudah digunakan oleh konsol lain`);
    }
  }

  // Station dengan tiket servis aktif tidak boleh dilepas dari MAINTENANCE secara manual.
  if (existing.status === ConsoleStatus.MAINTENANCE && validated.status === ConsoleStatus.AVAILABLE) {
    await assertNoOpenTickets("CONSOLE", id);
  }

  const updatePayload: Prisma.ConsoleUpdateInput = {
    ...data,
  };
  if (validated.consoleType) updatePayload.consoleType = validated.consoleType as ConsoleType;
  if (validated.status) updatePayload.status = validated.status as ConsoleStatus;

  return await prisma.console.update({
    where: { id },
    data: updatePayload,
  });
}

export async function updateConsoleStatus(id: string, status: ConsoleStatus) {
  const con = await prisma.console.findUnique({
    where: { id },
    include: {
      sessions: { where: { status: SessionStatus.ACTIVE } },
    },
  });

  if (!con) {
    throw new Error("Console Station tidak ditemukan");
  }

  const allowedStatuses = [ConsoleStatus.AVAILABLE, ConsoleStatus.IN_USE, ConsoleStatus.MAINTENANCE, ConsoleStatus.OFFLINE];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Status konsol '${status}' tidak valid`);
  }

  // Transition rule: cannot manually leave IN_USE while active session is running
  if (con.status === ConsoleStatus.IN_USE && status !== ConsoleStatus.IN_USE && con.sessions.length > 0) {
    throw new Error(`Konsol ${con.stationNumber} sedang memiliki sesi aktif. Selesaikan sesi terlebih dahulu sebelum mengubah status.`);
  }

  // Transition rule: cannot manually switch to IN_USE without starting a session
  if (con.status !== ConsoleStatus.IN_USE && status === ConsoleStatus.IN_USE && con.sessions.length === 0) {
    throw new Error(`Status IN_USE hanya dapat diaktifkan melalui sistem mulai sesi.`);
  }

  // Station dengan tiket servis aktif tidak boleh dilepas dari MAINTENANCE secara manual.
  if (con.status === ConsoleStatus.MAINTENANCE && status === ConsoleStatus.AVAILABLE) {
    await assertNoOpenTickets("CONSOLE", id);
  }

  const updateData: Prisma.ConsoleUpdateInput = { status };
  if (status === ConsoleStatus.AVAILABLE || status === ConsoleStatus.OFFLINE) {
    updateData.currentGame = null;
  }

  return await prisma.console.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteConsole(id: string) {
  const con = await prisma.console.findUnique({
    where: { id },
    include: {
      sessions: { where: { status: SessionStatus.ACTIVE } },
    },
  });

  if (!con) {
    throw new Error("Console Station tidak ditemukan");
  }

  if (con.sessions.length > 0) {
    throw new Error("Tidak dapat menghapus konsol yang sedang memiliki sesi aktif");
  }

  return await prisma.console.delete({ where: { id } });
}
