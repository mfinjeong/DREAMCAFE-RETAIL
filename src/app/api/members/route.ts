import { NextResponse } from "next/server";
import { listMembers, createMember } from "@/services/member.service";
import { memberSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q");
    const tier = searchParams.get("tier");

    const members = await listMembers({ search, tier });
    return NextResponse.json({ success: true, data: members });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server saat memuat member";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
    const msg = err instanceof Error ? err.message : "Gagal menambahkan member";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
