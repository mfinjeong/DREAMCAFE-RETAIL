import { NextResponse } from "next/server";
import { getMemberById, updateMember, deleteMember } from "@/services/member.service";
import { memberSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const member = await getMemberById(id);
    if (!member) {
      return NextResponse.json({ success: false, message: "Member tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: member });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await request.json();
    const validated = memberSchema.partial().safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await updateMember(id, validated.data);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Data member ${updated.fullName} berhasil diperbarui`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memperbarui data member", 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    await deleteMember(id);
    return NextResponse.json({ success: true, message: "Member berhasil dihapus" });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal menghapus member", 400);
  }
}
