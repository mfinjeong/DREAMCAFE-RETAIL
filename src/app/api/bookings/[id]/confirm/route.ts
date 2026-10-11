import { NextResponse } from "next/server";
import { confirmBooking } from "@/services/booking.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const confirmed = await confirmBooking(id);

    return NextResponse.json({
      success: true,
      data: confirmed,
      message: `Reservasi ${confirmed.bookingCode} berhasil dikonfirmasi`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal mengonfirmasi reservasi", 400);
  }
}
