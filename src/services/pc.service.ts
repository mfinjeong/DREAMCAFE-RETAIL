import { prisma } from "@/lib/prisma";
import { PCStatus, StationZone, Prisma, SessionStatus } from "@prisma/client";
import { pcSchema } from "@/lib/validators";
import { assertNoOpenTickets } from "@/services/maintenance.service";

export interface PCFilterOptions {
  status?: string | null;
  zone?: string | null;
  search?: string | null;
}

export type PCCreateInput = Prisma.PCUncheckedCreateInput;
export type PCUpdateInput = Prisma.PCUncheckedUpdateInput;

export async function listPCs(filters: PCFilterOptions = {}) {
  const where: Prisma.PCWhereInput = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as PCStatus;
  }
  if (filters.zone && filters.zone !== "ALL") {
    where.zone = filters.zone as StationZone;
  }
  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { stationNumber: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { specsGpu: { contains: q, mode: "insensitive" } },
      { specsCpu: { contains: q, mode: "insensitive" } },
    ];
  }

  const pcs = await prisma.pC.findMany({
    where,
    orderBy: { stationNumber: "asc" },
    include: {
      sessions: {
        where: { status: "ACTIVE" },
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

  return pcs.map((pc) => {
    const active = pc.sessions[0];
    return {
      id: pc.id,
      stationNumber: pc.stationNumber,
      name: pc.name,
      zone: pc.zone,
      status: pc.status,
      hourlyRate: pc.hourlyRate,
      specsCpu: pc.specsCpu,
      specsGpu: pc.specsGpu,
      specsRam: pc.specsRam,
      specsMonitor: pc.specsMonitor,
      specsStorage: pc.specsStorage,
      specsPeripherals: pc.specsPeripherals,
      ipAddress: pc.ipAddress,
      macAddress: pc.macAddress,
      currentGame: pc.currentGame,
      createdAt: pc.createdAt.toISOString(),
      updatedAt: pc.updatedAt.toISOString(),
      activeSession: active
        ? {
            id: active.id,
            sessionNumber: active.sessionNumber,
            stationId: pc.id,
            stationNumber: pc.stationNumber,
            type: "PC" as const,
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
            currentGame: pc.currentGame || null,
          }
        : null,
    };
  });
}

export async function getPCById(id: string) {
  const pc = await prisma.pC.findUnique({
    where: { id },
    include: {
      sessions: {
        where: { status: "ACTIVE" },
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

  if (!pc) return null;

  const active = pc.sessions[0];
  return {
    ...pc,
    createdAt: pc.createdAt.toISOString(),
    updatedAt: pc.updatedAt.toISOString(),
    activeSession: active
      ? {
          id: active.id,
          sessionNumber: active.sessionNumber,
          stationId: pc.id,
          stationNumber: pc.stationNumber,
          type: "PC" as const,
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
          currentGame: pc.currentGame || null,
        }
      : null,
  };
}

export async function createPC(data: PCCreateInput) {
  // Validate input with Zod
  const validated = pcSchema.parse(data);

  const existing = await prisma.pC.findUnique({
    where: { stationNumber: validated.stationNumber },
  });

  if (existing) {
    throw new Error(`Nomor station ${validated.stationNumber} sudah terdaftar`);
  }

  return await prisma.pC.create({
    data: {
      stationNumber: validated.stationNumber,
      name: validated.name,
      zone: validated.zone as StationZone,
      status: (validated.status as PCStatus) || PCStatus.AVAILABLE,
      hourlyRate: validated.hourlyRate,
      specsCpu: validated.specsCpu,
      specsGpu: validated.specsGpu,
      specsRam: validated.specsRam,
      specsMonitor: validated.specsMonitor,
      specsStorage: validated.specsStorage || "1TB NVMe SSD",
      specsPeripherals: validated.specsPeripherals || "Mechanical Keyboard + Mouse",
      ipAddress: validated.ipAddress || null,
      macAddress: validated.macAddress || null,
    },
  });
}

export async function updatePC(id: string, data: PCUpdateInput) {
  const existing = await prisma.pC.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("PC Station tidak ditemukan");
  }

  // Validate partial input with Zod
  const validated = pcSchema.partial().parse(data);

  if (validated.stationNumber && validated.stationNumber !== existing.stationNumber) {
    const duplicate = await prisma.pC.findUnique({
      where: { stationNumber: validated.stationNumber },
    });
    if (duplicate) {
      throw new Error(`Nomor station ${validated.stationNumber} sudah digunakan oleh station lain`);
    }
  }

  // Station dengan tiket servis aktif tidak boleh dilepas dari MAINTENANCE secara manual.
  if (existing.status === PCStatus.MAINTENANCE && validated.status === PCStatus.AVAILABLE) {
    await assertNoOpenTickets("PC", id);
  }

  const updatePayload: Prisma.PCUpdateInput = {
    ...data,
  };
  if (validated.zone) updatePayload.zone = validated.zone as StationZone;
  if (validated.status) updatePayload.status = validated.status as PCStatus;

  return await prisma.pC.update({
    where: { id },
    data: updatePayload,
  });
}

export async function updatePCStatus(id: string, status: PCStatus) {
  const pc = await prisma.pC.findUnique({
    where: { id },
    include: {
      sessions: { where: { status: SessionStatus.ACTIVE } },
    },
  });

  if (!pc) {
    throw new Error("PC Station tidak ditemukan");
  }

  const allowedStatuses = [PCStatus.AVAILABLE, PCStatus.IN_USE, PCStatus.MAINTENANCE, PCStatus.OFFLINE];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Status PC '${status}' tidak valid`);
  }

  // Transition rule: cannot manually leave IN_USE while active session is running
  if (pc.status === PCStatus.IN_USE && status !== PCStatus.IN_USE && pc.sessions.length > 0) {
    throw new Error(`PC ${pc.stationNumber} sedang memiliki sesi aktif. Selesaikan sesi terlebih dahulu sebelum mengubah status.`);
  }

  // Transition rule: cannot manually switch to IN_USE without starting a session
  if (pc.status !== PCStatus.IN_USE && status === PCStatus.IN_USE && pc.sessions.length === 0) {
    throw new Error(`Status IN_USE hanya dapat diaktifkan melalui sistem mulai sesi.`);
  }

  // Station dengan tiket servis aktif tidak boleh dilepas dari MAINTENANCE secara manual.
  if (pc.status === PCStatus.MAINTENANCE && status === PCStatus.AVAILABLE) {
    await assertNoOpenTickets("PC", id);
  }

  const updateData: Prisma.PCUpdateInput = { status };
  if (status === PCStatus.AVAILABLE || status === PCStatus.OFFLINE) {
    updateData.currentGame = null;
  }

  return await prisma.pC.update({
    where: { id },
    data: updateData,
  });
}

export async function deletePC(id: string) {
  const pc = await prisma.pC.findUnique({
    where: { id },
    include: {
      sessions: { where: { status: "ACTIVE" } },
    },
  });

  if (!pc) {
    throw new Error("PC Station tidak ditemukan");
  }

  if (pc.sessions.length > 0) {
    throw new Error("Tidak dapat menghapus PC yang sedang memiliki sesi aktif");
  }

  return await prisma.pC.delete({ where: { id } });
}
