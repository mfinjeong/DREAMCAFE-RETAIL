import { NextResponse } from "next/server";
import { getBookingById, cancelBooking } from "@/services/booking.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const msg = err instanceof Error ? err.message : "Gagal memuat reservasi";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const updated = await cancelBooking(id, body.reason);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Reservasi ${updated.bookingCode} berhasil dibatalkan`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membatalkan reservasi";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
