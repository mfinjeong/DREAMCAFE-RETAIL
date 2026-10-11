import { NextResponse } from "next/server";
import { listTransactions } from "@/services/transaction.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const memberId = searchParams.get("memberId");

    const transactions = await listTransactions({ type, memberId });
    return NextResponse.json({ success: true, data: transactions });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server saat memuat transaksi", 500);
  }
}
