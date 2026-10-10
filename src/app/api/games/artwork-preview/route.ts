import { NextResponse } from "next/server";
import { resolveGameArtwork } from "@/services/game-artwork.service";
import { requireUser, authErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser(["ADMIN", "OPERATOR"]);

    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title");

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, message: "Judul game wajib disertakan" }, { status: 400 });
    }

    const artwork = await resolveGameArtwork(title);

    return NextResponse.json({
      success: true,
      data: artwork,
    });
  } catch (err: unknown) {
    const { status, message } = authErrorResponse(err);
    if (status === 401 || status === 403) {
      return NextResponse.json({ success: false, message }, { status });
    }
    const msg = err instanceof Error ? err.message : "Gagal mencari artwork game";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
