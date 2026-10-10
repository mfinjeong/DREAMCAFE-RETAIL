import { NextResponse } from "next/server";
import { confirmBooking } from "@/services/booking.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const confirmed = await confirmBooking(id);

    return NextResponse.json({
      success: true,
      data: confirmed,
      message: `Reservasi ${confirmed.bookingCode} berhasil dikonfirmasi`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mengonfirmasi reservasi";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
