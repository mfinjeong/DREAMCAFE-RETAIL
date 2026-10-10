import { NextResponse } from "next/server";
import { listTransactions } from "@/services/transaction.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const memberId = searchParams.get("memberId");

    const transactions = await listTransactions({ type, memberId });
    return NextResponse.json({ success: true, data: transactions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server saat memuat transaksi";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
