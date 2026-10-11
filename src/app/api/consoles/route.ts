import { NextResponse } from "next/server";
import { listConsoles, createConsole } from "@/services/console.service";
import { consoleSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const consoleType = searchParams.get("type") || searchParams.get("consoleType");
    const search = searchParams.get("q");

    const consoles = await listConsoles({ status, consoleType, search });
    return NextResponse.json({ success: true, data: consoles });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server saat memuat data konsol", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const validated = consoleSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const consoleStation = await createConsole(validated.data);
    return NextResponse.json({
      success: true,
      data: consoleStation,
      message: `Console ${consoleStation.stationNumber} berhasil ditambahkan ke database`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal menambahkan console station", 400);
  }
}
