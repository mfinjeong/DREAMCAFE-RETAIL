import { NextResponse } from "next/server";
import { resolveGameArtwork } from "@/services/game-artwork.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

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
    return apiErrorResponse(err, "Gagal mencari artwork game", 500);
  }
}
