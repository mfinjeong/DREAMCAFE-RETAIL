import { NextResponse } from "next/server";
import { getBookingAvailability } from "@/services/booking.service";
import { bookingAvailabilitySchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || "";
    const startTime = searchParams.get("startTime") || "";
    const durationHours = searchParams.get("durationHours") || "2";
    const type = searchParams.get("type") || undefined;

    const validated = bookingAvailabilitySchema.safeParse({
      date,
      startTime,
      durationHours: Number(durationHours),
      type: type === "PC" || type === "CONSOLE" ? type : undefined,
    });

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const availability = await getBookingAvailability({
      date: validated.data.date,
      startTime: validated.data.startTime,
      durationHours: validated.data.durationHours,
      type: validated.data.type,
    });

    return NextResponse.json({ success: true, data: availability });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memeriksa ketersediaan stasiun";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
