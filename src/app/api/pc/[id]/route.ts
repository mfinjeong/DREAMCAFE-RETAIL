import { NextResponse } from "next/server";
import { getPCById, updatePC, deletePC, updatePCStatus } from "@/services/pc.service";
import { pcSchema } from "@/lib/validators";
import { PCStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pc = await getPCById(id);
    if (!pc) {
      return NextResponse.json({ success: false, message: "PC Station tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: pc });
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
    const validated = pcSchema.partial().safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await updatePC(id, validated.data);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Station ${updated.stationNumber} berhasil diperbarui`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui PC station";
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
      return NextResponse.json({ success: false, message: "Status station tidak valid" }, { status: 400 });
    }

    const updated = await updatePCStatus(id, status as PCStatus);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Status ${updated.stationNumber} diubah menjadi ${status}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui status station";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deletePC(id);
    return NextResponse.json({ success: true, message: "PC Station berhasil dihapus" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus PC station";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
