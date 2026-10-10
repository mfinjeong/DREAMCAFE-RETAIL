import { NextResponse } from "next/server";
import { getGameById, updateGame, deleteGame } from "@/services/game.service";
import { updateGameSchema } from "@/lib/validators";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const game = await getGameById(id);

    if (!game) {
      return NextResponse.json(
        { success: false, message: "Game tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: game });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateGameSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await updateGame(id, validated.data);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Data game '${updated.title}' berhasil diperbarui`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui game";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteGame(id);

    const message = result.deactivated
      ? "Game berhasil dinonaktifkan karena memiliki riwayat sesi"
      : "Game berhasil dihapus dari pustaka";

    return NextResponse.json({
      success: true,
      data: result,
      message,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus game";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
