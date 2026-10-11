import { NextResponse } from "next/server";
import { listMaintenance, createMaintenance } from "@/services/maintenance.service";
import { maintenanceCreateSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const data = await listMaintenance({
      status: searchParams.get("status"),
      search: searchParams.get("q"),
    });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
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
    return apiErrorResponse(err, "Gagal membuat tiket servis", 400);
  }
}
