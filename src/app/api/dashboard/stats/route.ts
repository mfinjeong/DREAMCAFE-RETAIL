import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentStatus, PCStatus } from "@prisma/client";
import { getJakartaDateBoundaries, getJakartaDateString } from "@/services/report.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();
    const todayStr = getJakartaDateString();
    const { start: startDate, end: endDate } = getJakartaDateBoundaries(todayStr);

    const [pcStats, activeSessionsCount, todayTransactions] = await Promise.all([
      prisma.pC.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.session.count({
        where: { status: "ACTIVE" },
      }),
      prisma.transaction.aggregate({
        where: {
          status: PaymentStatus.PAID,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const pcStatusCounts: Record<PCStatus, number> = {
      AVAILABLE: 0,
      IN_USE: 0,
      MAINTENANCE: 0,
      OFFLINE: 0,
    };

    for (const stat of pcStats) {
      pcStatusCounts[stat.status as PCStatus] = stat._count;
    }

    const todayRevenue = Math.round(todayTransactions._sum.totalAmount || 0);

    return NextResponse.json({
      success: true,
      data: {
        pcStatusCounts,
        totalPC: Object.values(pcStatusCounts).reduce((a, b) => a + b, 0),
        activeSessionsCount,
        todayRevenue,
      },
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Failed to load dashboard stats", 500);
  }
}
