import { NextResponse } from "next/server";
import { requireUser, apiErrorResponse } from "@/lib/auth";
import { GameSharingAccountService } from "@/services/game-sharing-account.service";
import { changeAccountStatusSchema } from "@/lib/game-sharing-account-validators";

const service = new GameSharingAccountService();

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(["ADMIN", "OPERATOR"]);
    const { id } = await params;

    const body = await request.json();
    const validated = changeAccountStatusSchema.safeParse({
      ...body,
      accountId: id,
    });

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await service.changeStatus(validated.data, user.id);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal mengubah status akun sharing", 400);
  }
}
