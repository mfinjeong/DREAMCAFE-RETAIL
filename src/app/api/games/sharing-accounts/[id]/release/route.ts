import { NextResponse } from "next/server";
import { requireUser, apiErrorResponse } from "@/lib/auth";
import { GameSharingAccountService } from "@/services/game-sharing-account.service";
import { releaseAllocationSchema } from "@/lib/game-sharing-account-validators";

const service = new GameSharingAccountService();

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/games/sharing-accounts/[id]/release
 * Body: { allocationId?: string, mode?: "release" | "cancel" }
 * - If allocationId provided, releases that allocation.
 * - Otherwise resolves the account's current ACTIVE allocation.
 * - mode="cancel" uses the ADMIN override (ALLOCATION_CANCELLED) audit action.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(["ADMIN", "OPERATOR"]);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === "cancel" ? "cancel" : "release";

    let allocationId: string | undefined =
      typeof body?.allocationId === "string" ? body.allocationId : undefined;

    if (!allocationId) {
      const active = await service.getActiveAllocationByAccount(id);
      if (!active) {
        return NextResponse.json(
          { success: false, message: "Tidak ada alokasi aktif untuk akun ini" },
          { status: 409 }
        );
      }
      allocationId = active.id;
    }

    const validated = releaseAllocationSchema.safeParse({ allocationId });
    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const result =
      mode === "cancel"
        ? await service.cancelAllocation(validated.data, user.id)
        : await service.releaseAllocation(validated.data, user.id);

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal melepas alokasi akun sharing", 400);
  }
}
