import { prisma } from "@/lib/prisma";
import {
  ConsoleStatus,
  MaintenanceStatus,
  PCStatus,
  Prisma,
  SessionStatus,
  SessionType,
} from "@prisma/client";
import { z } from "zod";
import { maintenanceCreateSchema, maintenanceUpdateSchema } from "@/lib/validators";

// Koneksi ke database bisa lambat; beri ruang lebih dari default 5 detik.
const TX_OPTIONS = { timeout: 15000, maxWait: 10000 };

const OPEN_STATUSES: MaintenanceStatus[] = [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS];

const ticketInclude = {
  pc: { select: { stationNumber: true, name: true } },
  console: { select: { stationNumber: true, name: true } },
} satisfies Prisma.MaintenanceInclude;

type TicketWithStation = Prisma.MaintenanceGetPayload<{ include: typeof ticketInclude }>;

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;
export type MaintenanceUpdateInput = z.infer<typeof maintenanceUpdateSchema>;

export interface MaintenanceFilterOptions {
  status?: string | null;
  search?: string | null;
}

function toDTO(t: TicketWithStation) {
  const station = t.pc || t.console;
  return {
    id: t.id,
    type: t.type,
    stationId: t.pcId || t.consoleId,
    stationNumber: station?.stationNumber ?? "(station dihapus)",
    stationName: station?.name ?? "-",
    title: t.title,
    description: t.description,
    cost: t.cost,
    technician: t.technician,
    status: t.status,
    reportedAt: t.reportedAt.toISOString(),
    resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
  };
}

/** Jumlah tiket servis yang belum selesai (SCHEDULED / IN_PROGRESS) untuk satu station. */
export async function countOpenTickets(
  type: "PC" | "CONSOLE",
  stationId: string,
  db: Pick<Prisma.TransactionClient, "maintenance"> = prisma
): Promise<number> {
  return db.maintenance.count({
    where: {
      status: { in: OPEN_STATUSES },
      ...(type === "PC" ? { pcId: stationId } : { consoleId: stationId }),
    },
  });
}

/** Dipakai service PC/Console: station dengan tiket aktif tidak boleh dilepas dari MAINTENANCE secara manual. */
export async function assertNoOpenTickets(type: "PC" | "CONSOLE", stationId: string): Promise<void> {
  const open = await countOpenTickets(type, stationId);
  if (open > 0) {
    throw new Error(
      "Station masih memiliki tiket servis aktif. Selesaikan tiketnya terlebih dahulu di menu Maintenance."
    );
  }
}

export async function listMaintenance(filters: MaintenanceFilterOptions = {}) {
  const where: Prisma.MaintenanceWhereInput = {};

  if (
    filters.status &&
    (Object.values(MaintenanceStatus) as string[]).includes(filters.status)
  ) {
    where.status = filters.status as MaintenanceStatus;
  }

  if (filters.search) {
    const q = filters.search.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { technician: { contains: q, mode: "insensitive" } },
        { pc: { is: { stationNumber: { contains: q, mode: "insensitive" } } } },
        { console: { is: { stationNumber: { contains: q, mode: "insensitive" } } } },
      ];
    }
  }

  const tickets = await prisma.maintenance.findMany({
    where,
    orderBy: { reportedAt: "desc" },
    include: ticketInclude,
  });

  return tickets.map(toDTO);
}

export async function createMaintenance(input: MaintenanceCreateInput) {
  const data = maintenanceCreateSchema.parse(input);
  const ticketData = {
    title: data.title,
    description: data.description,
    cost: Math.round(data.cost ?? 0),
    ...(data.technician ? { technician: data.technician } : {}),
    status: MaintenanceStatus.SCHEDULED,
  };

  if (data.type === "PC") {
    const pc = await prisma.pC.findUnique({
      where: { id: data.stationId },
      include: { sessions: { where: { status: SessionStatus.ACTIVE }, select: { id: true } } },
    });
    if (!pc) throw new Error("PC Station tidak ditemukan");
    if (pc.status === PCStatus.IN_USE || pc.sessions.length > 0) {
      throw new Error(
        `PC ${pc.stationNumber} sedang digunakan. Selesaikan sesi terlebih dahulu sebelum melaporkan kerusakan.`
      );
    }

    return prisma.$transaction(async (tx) => {
      // updateMany bersyarat: gagal bila sesi sempat dimulai di antara pengecekan dan penulisan.
      const locked = await tx.pC.updateMany({
        where: { id: pc.id, status: { not: PCStatus.IN_USE } },
        data: { status: PCStatus.MAINTENANCE, currentGame: null },
      });
      if (locked.count === 0) {
        throw new Error(`PC ${pc.stationNumber} sedang digunakan. Tiket tidak dibuat.`);
      }
      const ticket = await tx.maintenance.create({
        data: { ...ticketData, type: SessionType.PC, pcId: pc.id },
        include: ticketInclude,
      });
      return toDTO(ticket);
    }, TX_OPTIONS);
  }

  const con = await prisma.console.findUnique({
    where: { id: data.stationId },
    include: { sessions: { where: { status: SessionStatus.ACTIVE }, select: { id: true } } },
  });
  if (!con) throw new Error("Console Station tidak ditemukan");
  if (con.status === ConsoleStatus.IN_USE || con.sessions.length > 0) {
    throw new Error(
      `Konsol ${con.stationNumber} sedang digunakan. Selesaikan sesi terlebih dahulu sebelum melaporkan kerusakan.`
    );
  }

  return prisma.$transaction(async (tx) => {
    const locked = await tx.console.updateMany({
      where: { id: con.id, status: { not: ConsoleStatus.IN_USE } },
      data: { status: ConsoleStatus.MAINTENANCE, currentGame: null },
    });
    if (locked.count === 0) {
      throw new Error(`Konsol ${con.stationNumber} sedang digunakan. Tiket tidak dibuat.`);
    }
    const ticket = await tx.maintenance.create({
      data: { ...ticketData, type: SessionType.CONSOLE, consoleId: con.id },
      include: ticketInclude,
    });
    return toDTO(ticket);
  }, TX_OPTIONS);
}

export async function updateMaintenance(id: string, input: MaintenanceUpdateInput) {
  const data = maintenanceUpdateSchema.parse(input);

  const ticket = await prisma.maintenance.findUnique({ where: { id } });
  if (!ticket) throw new Error("Tiket servis tidak ditemukan");
  if (ticket.status === MaintenanceStatus.RESOLVED) {
    throw new Error("Tiket sudah selesai dan tidak dapat diubah lagi");
  }
  if (data.status === MaintenanceStatus.IN_PROGRESS && ticket.status !== MaintenanceStatus.SCHEDULED) {
    throw new Error("Tiket sudah dalam pengerjaan");
  }

  const update: Prisma.MaintenanceUpdateInput = {};
  if (data.technician) update.technician = data.technician;
  if (data.cost !== undefined) update.cost = Math.round(data.cost);
  if (data.status) update.status = data.status;

  const resolving = data.status === MaintenanceStatus.RESOLVED;
  if (resolving) {
    update.resolvedAt = new Date();
    if (data.notes) {
      update.description = `${ticket.description}\n\n[Catatan perbaikan] ${data.notes}`;
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.maintenance.update({
      where: { id },
      data: update,
      include: ticketInclude,
    });

    if (resolving) {
      // Station dibebaskan hanya jika tidak ada tiket terbuka lain pada station yang sama.
      if (ticket.pcId) {
        const remaining = await countOpenTickets("PC", ticket.pcId, tx);
        if (remaining === 0) {
          await tx.pC.updateMany({
            where: { id: ticket.pcId, status: PCStatus.MAINTENANCE },
            data: { status: PCStatus.AVAILABLE },
          });
        }
      } else if (ticket.consoleId) {
        const remaining = await countOpenTickets("CONSOLE", ticket.consoleId, tx);
        if (remaining === 0) {
          await tx.console.updateMany({
            where: { id: ticket.consoleId, status: ConsoleStatus.MAINTENANCE },
            data: { status: ConsoleStatus.AVAILABLE },
          });
        }
      }
    }

    return toDTO(updated);
  }, TX_OPTIONS);
}
