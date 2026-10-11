import { NextResponse } from "next/server";
import { listPCs, createPC } from "@/services/pc.service";
import { pcSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const zone = searchParams.get("zone");
    const search = searchParams.get("q");

    const pcs = await listPCs({ status, zone, search });
    return NextResponse.json({ success: true, data: pcs });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server saat memuat PC");
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const validated = pcSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const pc = await createPC(validated.data);
    return NextResponse.json({
      success: true,
      data: pc,
      message: `Station ${pc.stationNumber} berhasil ditambahkan ke database`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal menambahkan PC station");
  }
}
