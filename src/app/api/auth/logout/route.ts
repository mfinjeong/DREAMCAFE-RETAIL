import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth";

function logAuthError(scope: string, error: unknown): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(`[auth:${scope}] ${errorName}`);
}

export async function POST() {
  try {
    await revokeCurrentSession();
    return NextResponse.json({ success: true, message: "Logout berhasil" });
  } catch (err: unknown) {
    logAuthError("logout", err);
    return NextResponse.json({ success: false, message: "Gagal melakukan logout" }, { status: 500 });
  }
}
