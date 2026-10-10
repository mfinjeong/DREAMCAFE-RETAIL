import { NextResponse } from "next/server";
import { getConsoleById, updateConsole, deleteConsole, updateConsoleStatus } from "@/services/console.service";
import { consoleSchema } from "@/lib/validators";
import { ConsoleStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const con = await getConsoleById(id);
    if (!con) {
      return NextResponse.json({ success: false, message: "Console Station tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: con });
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
    const validated = consoleSchema.partial().safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await updateConsole(id, validated.data);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Console ${updated.stationNumber} berhasil diperbarui`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui console station";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["AVAILABLE", "IN_USE", "MAINTENANCE", "OFFLINE"].includes(status)) {
      return NextResponse.json({ success: false, message: "Status konsol tidak valid" }, { status: 400 });
    }

    const updated = await updateConsoleStatus(id, status as ConsoleStatus);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Status ${updated.stationNumber} diubah menjadi ${status}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui status konsol";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteConsole(id);
    return NextResponse.json({ success: true, message: "Console Station berhasil dihapus" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus console station";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
