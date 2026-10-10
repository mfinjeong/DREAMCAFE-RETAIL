import { prisma } from "@/lib/prisma";
import { MemberTier, Prisma } from "@prisma/client";
import { memberSchema, updateMemberSchema } from "@/lib/validators";

export interface MemberFilterOptions {
  search?: string | null;
  tier?: string | null;
}

export interface MemberCreateInput {
  fullName: string;
  username?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  tier?: MemberTier;
  balance?: number;
  notes?: string | null;
}

export interface MemberUpdateInput {
  fullName?: string;
  username?: string;
  phoneNumber?: string | null;
  email?: string | null;
  tier?: MemberTier;
  balance?: number;
  notes?: string | null;
  avatarUrl?: string | null;
}

export async function listMembers(filters: MemberFilterOptions = {}) {
  const where: Prisma.MemberWhereInput = {};

  if (filters.tier && filters.tier !== "ALL") {
    where.tier = filters.tier as MemberTier;
  }
  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
      { memberCode: { contains: q, mode: "insensitive" } },
      { phoneNumber: { contains: q } },
    ];
  }

  const members = await prisma.member.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          sessions: true,
          transactions: true,
        },
      },
    },
  });

  return members.map((m) => ({
    id: m.id,
    memberCode: m.memberCode,
    fullName: m.fullName,
    username: m.username,
    phoneNumber: m.phoneNumber,
    email: m.email,
    tier: m.tier,
    balance: m.balance,
    dreamCoins: m.dreamCoins,
    xp: m.xp,
    level: m.level,
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    totalSessions: m._count.sessions,
    totalTransactions: m._count.transactions,
  }));
}

export async function getMemberById(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { startTime: "desc" },
        take: 5,
        include: { pc: true, console: true },
      },
      bookings: {
        orderBy: { bookingDate: "desc" },
        take: 5,
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!member) return null;

  const spendingAgg = await prisma.transaction.aggregate({
    where: { memberId: id, status: "PAID" },
    _sum: { totalAmount: true },
  });
  const totalSpending = spendingAgg._sum.totalAmount || 0;

  return {
    ...member,
    totalSpending,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    sessions: member.sessions.map((s) => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      stationName: s.pc ? s.pc.stationNumber : s.console ? s.console.stationNumber : "Station",
      type: s.type,
      durationMinutes: s.durationMinutes,
      totalPrice: s.totalPrice,
      status: s.status,
      startTime: s.startTime.toISOString(),
    })),
    transactions: member.transactions.map((t) => ({
      id: t.id,
      invoiceNumber: t.invoiceNumber,
      type: t.type,
      totalAmount: t.totalAmount,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function deleteMember(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      sessions: { where: { status: "ACTIVE" } },
    },
  });

  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  if (member.sessions.length > 0) {
    throw new Error("Tidak dapat menghapus member yang sedang memiliki sesi aktif");
  }

  return await prisma.member.delete({ where: { id } });
}

export async function searchMembers(query: string) {
  return await listMembers({ search: query });
}

export async function createMember(data: MemberCreateInput) {
  // Validate input with Zod
  const validated = memberSchema.parse(data);

  // Generate username if not provided
  let username = validated.username?.trim();
  if (!username) {
    const base = validated.fullName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "member";
    const rand = Math.floor(100 + Math.random() * 900);
    username = `${base}${rand}`;
  }

  const phoneNumber = validated.phoneNumber && validated.phoneNumber.trim().length > 0 ? validated.phoneNumber.trim() : null;
  const email = validated.email && validated.email.trim().length > 0 ? validated.email.trim() : null;

  // Check unique constraints for username
  const existingUsername = await prisma.member.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
  if (existingUsername) {
    throw new Error(`Username '${username}' sudah terdaftar`);
  }

  // Check unique constraints for phone if provided
  if (phoneNumber) {
    const existingPhone = await prisma.member.findFirst({
      where: { phoneNumber },
    });
    if (existingPhone) {
      throw new Error(`Nomor telepon '${phoneNumber}' sudah terdaftar`);
    }
  }

  // Check unique constraints for email if provided
  if (email) {
    const existingEmail = await prisma.member.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existingEmail) {
      throw new Error(`Email '${email}' sudah terdaftar`);
    }
  }

  // Generate unique member code (e.g. DC-XXXXX)
  let codeNum = (await prisma.member.count()) + 101;
  let memberCode = `DC-${String(codeNum).padStart(5, "0")}`;
  while (await prisma.member.findUnique({ where: { memberCode }, select: { id: true } })) {
    codeNum++;
    memberCode = `DC-${String(codeNum).padStart(5, "0")}`;
  }

  return await prisma.member.create({
    data: {
      memberCode,
      fullName: validated.fullName,
      username,
      phoneNumber,
      email,
      tier: (validated.tier as MemberTier) || MemberTier.REGULAR,
      balance: validated.balance || 0,
      dreamCoins: 100, // Sign-up bonus
      xp: 0,
      level: 1,
      notes: validated.notes || null,
    },
  });
}

export async function updateMember(id: string, data: MemberUpdateInput) {
  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Member tidak ditemukan");
  }

  // Validate input with Zod
  const validated = updateMemberSchema.parse(data);

  const phoneNumber = validated.phoneNumber !== undefined
    ? (validated.phoneNumber && validated.phoneNumber.trim().length > 0 ? validated.phoneNumber.trim() : null)
    : undefined;
  const email = validated.email !== undefined
    ? (validated.email && validated.email.trim().length > 0 ? validated.email.trim() : null)
    : undefined;

  // Check unique constraints if changing username, phone, or email
  if (validated.username && validated.username.toLowerCase() !== existing.username.toLowerCase()) {
    const dup = await prisma.member.findFirst({
      where: {
        username: { equals: validated.username, mode: "insensitive" },
        id: { not: id },
      },
    });
    if (dup) throw new Error(`Username '${validated.username}' sudah digunakan`);
  }

  if (phoneNumber && phoneNumber !== existing.phoneNumber) {
    const dup = await prisma.member.findFirst({
      where: {
        phoneNumber,
        id: { not: id },
      },
    });
    if (dup) throw new Error(`Nomor telepon '${phoneNumber}' sudah digunakan`);
  }

  if (email && email.toLowerCase() !== existing.email?.toLowerCase()) {
    const dup = await prisma.member.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        id: { not: id },
      },
    });
    if (dup) throw new Error(`Email '${email}' sudah digunakan`);
  }

  const updateData: Prisma.MemberUpdateInput = {};
  if (validated.fullName !== undefined) updateData.fullName = validated.fullName;
  if (validated.username !== undefined) updateData.username = validated.username;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (email !== undefined) updateData.email = email;
  if (validated.tier !== undefined) updateData.tier = validated.tier as MemberTier;
  if (validated.balance !== undefined) updateData.balance = validated.balance;
  if (validated.notes !== undefined) updateData.notes = validated.notes;
  if (validated.avatarUrl !== undefined) updateData.avatarUrl = validated.avatarUrl;

  return await prisma.member.update({
    where: { id },
    data: updateData,
  });
}

export async function updateMemberBalance(id: string, amount: number, operation: "add" | "deduct") {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw new Error("Member tidak ditemukan");

  const newBalance = operation === "add" ? member.balance + amount : member.balance - amount;
  if (newBalance < 0) {
    throw new Error(`Saldo tidak mencukupi (Saldo: Rp${member.balance.toLocaleString("id-ID")}, Dibutuhkan: Rp${amount.toLocaleString("id-ID")})`);
  }

  return await prisma.member.update({
    where: { id },
    data: { balance: newBalance },
  });
}

export async function addMemberXP(id: string, xpToAdd: number) {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return null;

  const totalXP = member.xp + xpToAdd;
  const newLevel = Math.max(1, Math.floor(totalXP / 500) + 1);

  return await prisma.member.update({
    where: { id },
    data: {
      xp: totalXP,
      level: newLevel,
      dreamCoins: { increment: Math.floor(xpToAdd / 10) },
    },
  });
}
