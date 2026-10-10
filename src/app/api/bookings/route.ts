import { NextResponse } from "next/server";
import { listBookings, createBooking } from "@/services/booking.service";
import { bookingSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const memberId = searchParams.get("memberId");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const bookings = await listBookings({ status, date, memberId, type, search });
    return NextResponse.json({ success: true, data: bookings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server saat memuat reservasi";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = bookingSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const booking = await createBooking({
      memberId: validated.data.memberId,
      type: validated.data.type,
      stationId: validated.data.stationId,
      bookingDate: validated.data.bookingDate,
      startTime: validated.data.startTime,
      durationHours: validated.data.durationHours,
      status: validated.data.status,
      notes: validated.data.notes,
    });

    return NextResponse.json({
      success: true,
      data: booking,
      message: `Reservasi ${booking.bookingCode} berhasil dibuat (${booking.startTime} - ${booking.endTime})`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membuat reservasi";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
