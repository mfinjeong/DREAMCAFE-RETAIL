import { prisma } from "@/lib/prisma";
import { BookingStatus, SessionType, PCStatus, ConsoleStatus, Prisma } from "@prisma/client";
import { startSession } from "./session.service";

export interface BookingCreateInput {
  memberId: string;
  type: "PC" | "CONSOLE";
  stationId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm (e.g. "14:00")
  durationHours: number;
  status?: BookingStatus;
  notes?: string | null;
}

// Convert "HH:mm" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length !== 2) {
    throw new Error("Format waktu tidak valid (harus HH:mm)");
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Format waktu tidak valid (harus HH:mm antara 00:00 dan 23:59)");
  }
  return hours * 60 + minutes;
}

// Convert minutes from midnight back to "HH:mm"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function listBookings(filters: {
  status?: string | null;
  date?: string | null;
  memberId?: string | null;
  type?: string | null;
  search?: string | null;
} = {}) {
  const where: Prisma.BookingWhereInput = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as BookingStatus;
  }
  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type as SessionType;
  }
  if (filters.memberId) {
    where.memberId = filters.memberId;
  }
  if (filters.date) {
    const targetDate = new Date(`${filters.date}T00:00:00.000Z`);
    const nextDate = new Date(`${filters.date}T23:59:59.999Z`);
    where.bookingDate = {
      gte: targetDate,
      lte: nextDate,
    };
  }

  if (filters.search && filters.search.trim()) {
    const query = filters.search.trim();
    where.OR = [
      { bookingCode: { contains: query, mode: "insensitive" } },
      { member: { fullName: { contains: query, mode: "insensitive" } } },
      { member: { username: { contains: query, mode: "insensitive" } } },
      { pc: { stationNumber: { contains: query, mode: "insensitive" } } },
      { console: { stationNumber: { contains: query, mode: "insensitive" } } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
    include: {
      member: true,
      pc: true,
      console: true,
    },
  });

  return bookings.map((b) => {
    const stationNumber = b.pc ? b.pc.stationNumber : b.console ? b.console.stationNumber : "-";
    const stationName = b.pc ? b.pc.name : b.console ? b.console.name : "Station";

    return {
      id: b.id,
      bookingCode: b.bookingCode,
      type: b.type,
      stationId: b.pcId || b.consoleId || "",
      pcId: b.pcId,
      consoleId: b.consoleId,
      stationNumber,
      pcStationNumber: b.pc?.stationNumber || null,
      consoleStationNumber: b.console?.stationNumber || null,
      stationName,
      memberId: b.memberId,
      memberName: b.member.fullName,
      username: b.member.username,
      phoneNumber: b.member.phoneNumber,
      bookingDate: b.bookingDate.toISOString().slice(0, 10),
      startTime: b.startTime,
      endTime: b.endTime,
      durationHours: b.durationHours,
      totalPrice: b.totalPrice,
      status: b.status,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
    };
  });
}

export async function getBookingById(id: string) {
  const b = await prisma.booking.findUnique({
    where: { id },
    include: {
      member: true,
      pc: true,
      console: true,
    },
  });

  if (!b) return null;

  const stationNumber = b.pc ? b.pc.stationNumber : b.console ? b.console.stationNumber : "-";
  const stationName = b.pc ? b.pc.name : b.console ? b.console.name : "Station";

  return {
    id: b.id,
    bookingCode: b.bookingCode,
    type: b.type,
    stationId: b.pcId || b.consoleId || "",
    pcId: b.pcId,
    consoleId: b.consoleId,
    stationNumber,
    pcStationNumber: b.pc?.stationNumber || null,
    consoleStationNumber: b.console?.stationNumber || null,
    stationName,
    memberId: b.memberId,
    memberName: b.member.fullName,
    username: b.member.username,
    phoneNumber: b.member.phoneNumber,
    bookingDate: b.bookingDate.toISOString().slice(0, 10),
    startTime: b.startTime,
    endTime: b.endTime,
    durationHours: b.durationHours,
    totalPrice: b.totalPrice,
    status: b.status,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
  };
}

export async function getBookingAvailability(params: {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationHours: number;
  type?: "PC" | "CONSOLE";
}) {
  if (!params.date || !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    throw new Error("Format tanggal tidak valid (harus YYYY-MM-DD)");
  }
  if (!params.durationHours || params.durationHours <= 0) {
    throw new Error("Durasi booking minimal 1 jam");
  }

  const startMin = timeToMinutes(params.startTime);
  const endMin = startMin + params.durationHours * 60;
  if (endMin > 24 * 60) {
    throw new Error("Waktu reservasi melebihi pukul 24:00");
  }

  const bookingDate = new Date(`${params.date}T00:00:00.000Z`);
  const nextDate = new Date(`${params.date}T23:59:59.999Z`);

  // Query existing active bookings for that date
  const existingBookings = await prisma.booking.findMany({
    where: {
      bookingDate: {
        gte: bookingDate,
        lte: nextDate,
      },
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    },
    select: {
      pcId: true,
      consoleId: true,
      startTime: true,
      endTime: true,
    },
  });

  // Overlapping station IDs
  const overlappingPcIds = new Set<string>();
  const overlappingConsoleIds = new Set<string>();

  for (const b of existingBookings) {
    const existingStart = timeToMinutes(b.startTime);
    const existingEnd = timeToMinutes(b.endTime);

    // Overlap: slotA.start < slotB.end && slotA.end > slotB.start
    if (startMin < existingEnd && endMin > existingStart) {
      if (b.pcId) overlappingPcIds.add(b.pcId);
      if (b.consoleId) overlappingConsoleIds.add(b.consoleId);
    }
  }

  let pcs: {
    id: string;
    stationNumber: string;
    name: string;
    zone: string;
    status: string;
    hourlyRate: number;
    specsCpu: string;
    specsGpu: string;
  }[] = [];

  let consoles: {
    id: string;
    stationNumber: string;
    name: string;
    consoleType: string;
    status: string;
    hourlyRate: number;
    specsDisplay: string;
  }[] = [];

  if (!params.type || params.type === "PC") {
    // Only fetch PCs that are not in MAINTENANCE or OFFLINE
    const allPCs = await prisma.pC.findMany({
      where: {
        status: { notIn: [PCStatus.MAINTENANCE, PCStatus.OFFLINE] },
      },
      orderBy: { stationNumber: "asc" },
    });

    pcs = allPCs
      .filter((p) => !overlappingPcIds.has(p.id))
      .map((p) => ({
        id: p.id,
        stationNumber: p.stationNumber,
        name: p.name,
        zone: p.zone,
        status: p.status,
        hourlyRate: p.hourlyRate,
        specsCpu: p.specsCpu,
        specsGpu: p.specsGpu,
      }));
  }

  if (!params.type || params.type === "CONSOLE") {
    // Only fetch Consoles that are not in MAINTENANCE or OFFLINE
    const allConsoles = await prisma.console.findMany({
      where: {
        status: { notIn: [ConsoleStatus.MAINTENANCE, ConsoleStatus.OFFLINE] },
      },
      orderBy: { stationNumber: "asc" },
    });

    consoles = allConsoles
      .filter((c) => !overlappingConsoleIds.has(c.id))
      .map((c) => ({
        id: c.id,
        stationNumber: c.stationNumber,
        name: c.name,
        consoleType: c.consoleType,
        status: c.status,
        hourlyRate: c.hourlyRate,
        specsDisplay: c.specsDisplay,
      }));
  }

  return { pcs, consoles };
}

export async function createBooking(data: BookingCreateInput) {
  // 1. Verify Member
  if (!data.memberId || !data.memberId.trim()) {
    throw new Error("Member wajib dipilih");
  }
  const member = await prisma.member.findUnique({
    where: { id: data.memberId },
  });
  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  // 2. Validate duration
  if (!data.durationHours || data.durationHours <= 0) {
    throw new Error("Durasi booking minimal 1 jam");
  }
  if (!Number.isInteger(data.durationHours)) {
    throw new Error("Durasi booking harus berupa bilangan bulat");
  }

  // 3. Time calculations & validation
  const startMin = timeToMinutes(data.startTime);
  const endMin = startMin + data.durationHours * 60;
  if (endMin > 24 * 60) {
    throw new Error("Durasi booking melewati tengah malam (maksimal jam 24:00)");
  }
  const endTimeStr = minutesToTime(endMin);

  if (!data.bookingDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.bookingDate)) {
    throw new Error("Format tanggal harus YYYY-MM-DD");
  }
  const bookingDate = new Date(`${data.bookingDate}T00:00:00.000Z`);
  const nextDate = new Date(`${data.bookingDate}T23:59:59.999Z`);

  // 4. Verify Station & Station Status
  let hourlyRate = 10000;
  let stationIdentifier = "";

  if (data.type === "PC") {
    const pc = await prisma.pC.findUnique({ where: { id: data.stationId } });
    if (!pc) throw new Error("PC Station tidak ditemukan");
    if (pc.status === PCStatus.MAINTENANCE) {
      throw new Error(`Station ${pc.stationNumber} sedang dalam pemeliharaan (MAINTENANCE)`);
    }
    if (pc.status === PCStatus.OFFLINE) {
      throw new Error(`Station ${pc.stationNumber} sedang offline (OFFLINE)`);
    }
    hourlyRate = pc.hourlyRate;
    stationIdentifier = pc.stationNumber;
  } else {
    const con = await prisma.console.findUnique({ where: { id: data.stationId } });
    if (!con) throw new Error("Console Station tidak ditemukan");
    if (con.status === ConsoleStatus.MAINTENANCE) {
      throw new Error(`Station ${con.stationNumber} sedang dalam pemeliharaan (MAINTENANCE)`);
    }
    if (con.status === ConsoleStatus.OFFLINE) {
      throw new Error(`Station ${con.stationNumber} sedang offline (OFFLINE)`);
    }
    hourlyRate = con.hourlyRate;
    stationIdentifier = con.stationNumber;
  }

  // 5. Atomic Prisma transaction for conflict check & creation
  return await prisma.$transaction(async (tx) => {
    // Check overlap: slotA.start < slotB.end && slotA.end > slotB.start
    const existingBookings = await tx.booking.findMany({
      where: {
        bookingDate: {
          gte: bookingDate,
          lte: nextDate,
        },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        OR: [
          { pcId: data.type === "PC" ? data.stationId : undefined },
          { consoleId: data.type === "CONSOLE" ? data.stationId : undefined },
        ],
      },
    });

    for (const b of existingBookings) {
      const existingStart = timeToMinutes(b.startTime);
      const existingEnd = timeToMinutes(b.endTime);

      if (startMin < existingEnd && endMin > existingStart) {
        throw new Error(
          `Jadwal bentrok! Station ${stationIdentifier} sudah di-booking pada pukul ${b.startTime} - ${b.endTime} (${b.bookingCode})`
        );
      }
    }

    // Authoritative total price
    const totalPrice = Math.round(data.durationHours * hourlyRate);

    // Generate unique booking code: BK-YYYYMMDD-XXX
    const dateStr = data.bookingDate.replace(/-/g, "");
    const count = await tx.booking.count();
    const bookingCode = `BK-${dateStr}-${String(count + 1).padStart(3, "0")}`;

    const initialStatus = data.status || BookingStatus.CONFIRMED;

    return await tx.booking.create({
      data: {
        bookingCode,
        type: data.type,
        pcId: data.type === "PC" ? data.stationId : null,
        consoleId: data.type === "CONSOLE" ? data.stationId : null,
        memberId: data.memberId,
        bookingDate,
        startTime: data.startTime,
        endTime: endTimeStr,
        durationHours: data.durationHours,
        totalPrice,
        status: initialStatus,
        notes: data.notes || null,
      },
      include: {
        member: true,
        pc: true,
        console: true,
      },
    });
  });
}

export async function confirmBooking(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      member: true,
      pc: true,
      console: true,
    },
  });

  if (!booking) {
    throw new Error("Reservasi tidak ditemukan");
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new Error("Reservasi sudah dibatalkan, tidak dapat dikonfirmasi");
  }

  if (booking.status === BookingStatus.COMPLETED) {
    throw new Error("Reservasi sudah selesai, tidak dapat dikonfirmasi kembali");
  }

  if (booking.status === BookingStatus.CONFIRMED) {
    return booking;
  }

  // Check for conflicts before confirming
  const startMin = timeToMinutes(booking.startTime);
  const endMin = timeToMinutes(booking.endTime);
  const stationId = booking.pcId || booking.consoleId;
  const stationIdentifier = booking.pc ? booking.pc.stationNumber : booking.console ? booking.console.stationNumber : "Station";

  const nextDate = new Date(booking.bookingDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const conflicts = await prisma.booking.findMany({
    where: {
      id: { not: booking.id },
      bookingDate: {
        gte: booking.bookingDate,
        lt: nextDate,
      },
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      OR: [
        { pcId: booking.type === "PC" ? stationId : undefined },
        { consoleId: booking.type === "CONSOLE" ? stationId : undefined },
      ],
    },
  });

  for (const b of conflicts) {
    const existingStart = timeToMinutes(b.startTime);
    const existingEnd = timeToMinutes(b.endTime);

    if (startMin < existingEnd && endMin > existingStart) {
      throw new Error(
        `Jadwal bentrok! Station ${stationIdentifier} sudah di-booking pada pukul ${b.startTime} - ${b.endTime} (${b.bookingCode})`
      );
    }
  }

  return await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CONFIRMED,
    },
    include: {
      member: true,
      pc: true,
      console: true,
    },
  });
}

export async function cancelBooking(id: string, reason?: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    throw new Error("Reservasi tidak ditemukan");
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new Error("Reservasi sudah dibatalkan sebelumnya");
  }

  if (booking.status === BookingStatus.COMPLETED) {
    throw new Error("Reservasi yang sudah selesai tidak dapat dibatalkan");
  }

  return await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      notes: reason ? `${booking.notes || ""} [Dibatalkan: ${reason}]`.trim() : booking.notes,
    },
    include: {
      member: true,
      pc: true,
      console: true,
    },
  });
}

export async function startBookingSession(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      member: true,
      pc: true,
      console: true,
    },
  });

  if (!booking) {
    throw new Error("Reservasi tidak ditemukan");
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new Error("Reservasi sudah dibatalkan, tidak dapat memulai sesi");
  }

  if (booking.status === BookingStatus.COMPLETED) {
    throw new Error("Reservasi sudah selesai / sesi sudah pernah dimulai");
  }

  const stationId = booking.pcId || booking.consoleId;
  if (!stationId) {
    throw new Error("Station reservasi tidak valid");
  }

  // Reuse existing startSession service
  const session = await startSession({
    stationId,
    type: booking.type,
    memberId: booking.memberId,
    durationMinutes: booking.durationHours * 60,
    notes: booking.notes ? `Reservasi ${booking.bookingCode}: ${booking.notes}` : `Reservasi ${booking.bookingCode}`,
  });

  // Transition booking status to COMPLETED
  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.COMPLETED,
    },
    include: {
      member: true,
      pc: true,
      console: true,
    },
  });

  return {
    booking: updatedBooking,
    session,
  };
}

export async function deleteBooking(id: string) {
  return await prisma.booking.delete({ where: { id } });
}
