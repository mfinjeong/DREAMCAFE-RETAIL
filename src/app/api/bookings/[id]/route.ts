import { NextResponse } from "next/server";
import { getBookingById, cancelBooking } from "@/services/booking.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Reservasi tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: booking });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memuat reservasi", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const updated = await cancelBooking(id, body.reason);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Reservasi ${updated.bookingCode} berhasil dibatalkan`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal membatalkan reservasi", 400);
  }
}
