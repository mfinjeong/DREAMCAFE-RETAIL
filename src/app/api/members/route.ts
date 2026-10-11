import { NextResponse } from "next/server";
import { listMembers, createMember } from "@/services/member.service";
import { memberSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q");
    const tier = searchParams.get("tier");

    const members = await listMembers({ search, tier });
    return NextResponse.json({ success: true, data: members });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server saat memuat member", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const validated = memberSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const member = await createMember(validated.data);
    return NextResponse.json({
      success: true,
      data: member,
      message: `Member ${member.fullName} (${member.memberCode}) berhasil didaftarkan`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal menambahkan member", 400);
  }
}
