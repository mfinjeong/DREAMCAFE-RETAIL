import { NextResponse } from "next/server";
import { cancelBooking } from "@/services/booking.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const cancelled = await cancelBooking(id, body.reason);

    return NextResponse.json({
      success: true,
      data: cancelled,
      message: `Reservasi ${cancelled.bookingCode} berhasil dibatalkan`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membatalkan reservasi";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
