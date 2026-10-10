import { NextResponse } from "next/server";
import { updateMaintenance } from "@/services/maintenance.service";
import { maintenanceUpdateSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = maintenanceUpdateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const ticket = await updateMaintenance(id, validated.data);
    return NextResponse.json({
      success: true,
      data: ticket,
      message:
        ticket.status === "RESOLVED"
          ? `Perbaikan ${ticket.stationNumber} selesai`
          : `Tiket ${ticket.stationNumber} diperbarui`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui tiket servis";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
