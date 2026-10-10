import { NextResponse } from "next/server";
import { listMaintenance, createMaintenance } from "@/services/maintenance.service";
import { maintenanceCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listMaintenance({
      status: searchParams.get("status"),
      search: searchParams.get("q"),
    });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = maintenanceCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const ticket = await createMaintenance(validated.data);
    return NextResponse.json({
      success: true,
      data: ticket,
      message: `Tiket servis ${ticket.stationNumber} dibuat. Station dikunci (MAINTENANCE).`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membuat tiket servis";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
