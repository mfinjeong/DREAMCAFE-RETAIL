import { NextResponse } from "next/server";
import { requireUser, apiErrorResponse } from "@/lib/auth";
import { GameSharingAccountService } from "@/services/game-sharing-account.service";
import { gameSharingAccountCreateSchema, sharingAccountCodeSchema } from "@/lib/game-sharing-account-validators";

const service = new GameSharingAccountService();

export async function GET(request: Request) {
  try {
    const user = await requireUser(["ADMIN", "OPERATOR", "STAFF"]);

    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || undefined;
    const status = searchParams.get("status") || undefined;

    const accounts = await service.listAccounts({ gameId, status }, user.id);
    return NextResponse.json({ success: true, data: accounts });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memuat daftar akun sharing", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["ADMIN", "OPERATOR"]);

    const body = await request.json();
    const validated = gameSharingAccountCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const account = await service.createAccount(validated.data, user.id);
    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal membuat akun sharing", 500);
  }
}
