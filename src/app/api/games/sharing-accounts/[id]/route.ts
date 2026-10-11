import { NextResponse } from "next/server";
import { requireUser, apiErrorResponse } from "@/lib/auth";
import { GameSharingAccountService } from "@/services/game-sharing-account.service";
import { gameSharingAccountUpdateSchema } from "@/lib/game-sharing-account-validators";

const service = new GameSharingAccountService();

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser(["ADMIN", "OPERATOR", "STAFF"]);
    const { id } = await params;

    const account = await service.getAccount(id);
    if (!account) {
      return NextResponse.json(
        { success: false, message: "Akun sharing tidak ditemukan" },
        { status: 404 }
      );
    }

    const activeAllocation = await service.getActiveAllocationByAccount(id);

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        activeAllocation,
      },
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memuat detail akun sharing", 500);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser(["ADMIN", "OPERATOR"]);
    const { id } = await params;

    const body = await request.json();
    const validated = gameSharingAccountUpdateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await service.updateAccount(id, validated.data, user.id);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memperbarui akun sharing", 400);
  }
}
