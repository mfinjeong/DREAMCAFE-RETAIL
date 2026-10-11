import { NextResponse } from "next/server";
import { requireUser, apiErrorResponse } from "@/lib/auth";
import { GameSharingAccountService } from "@/services/game-sharing-account.service";
import { auditLogFilterSchema } from "@/lib/game-sharing-account-validators";

const service = new GameSharingAccountService();

export async function GET(request: Request) {
  try {
    await requireUser(["ADMIN", "OPERATOR"]);

    const { searchParams } = new URL(request.url);
    const filter: Record<string, string | undefined> = {
      accountId: searchParams.get("accountId") ?? undefined,
      allocationId: searchParams.get("allocationId") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      performedByUserId: searchParams.get("performedByUserId") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    };

    const validated = auditLogFilterSchema.safeParse(filter);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const logs = await service.listAuditLogs(validated.data);
    return NextResponse.json({ success: true, data: logs });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memuat log audit akun sharing", 500);
  }
}
