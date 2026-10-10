import { NextResponse } from "next/server";
import { startBookingSession } from "@/services/booking.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await startBookingSession(id);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Sesi ${result.session.sessionNumber} berhasil dimulai dari reservasi ${result.booking.bookingCode}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memulai sesi dari reservasi";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
