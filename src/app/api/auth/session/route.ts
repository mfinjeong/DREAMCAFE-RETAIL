import { NextResponse } from "next/server";
import { getCurrentUser, authErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Tidak ada sesi login aktif" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (err: unknown) {
    return authErrorResponse(err);
  }
}
