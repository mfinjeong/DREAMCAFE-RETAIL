import { NextResponse } from "next/server";
import { updateMaintenance } from "@/services/maintenance.service";
import { maintenanceUpdateSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
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
    return apiErrorResponse(err, "Gagal memperbarui tiket servis", 400);
  }
}
