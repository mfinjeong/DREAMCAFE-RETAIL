import { NextResponse } from "next/server";
import { startBookingSession } from "@/services/booking.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const result = await startBookingSession(id);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Sesi ${result.session.sessionNumber} berhasil dimulai dari reservasi ${result.booking.bookingCode}`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memulai sesi dari reservasi", 400);
  }
}
