import { NextResponse } from "next/server";
import { cancelBooking } from "@/services/booking.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const cancelled = await cancelBooking(id, body.reason);

    return NextResponse.json({
      success: true,
      data: cancelled,
      message: `Reservasi ${cancelled.bookingCode} berhasil dibatalkan`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal membatalkan reservasi", 400);
  }
}
