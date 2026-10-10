import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth";

export async function POST() {
  try {
    await revokeCurrentSession();
    return NextResponse.json({ success: true, message: "Logout berhasil" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal melakukan logout";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
