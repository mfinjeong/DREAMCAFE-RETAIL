import { NextResponse } from "next/server";
import { createPosCheckout } from "@/services/transaction.service";
import { posCheckoutSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const validated = posCheckoutSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await createPosCheckout({
      memberId: validated.data.memberId,
      items: validated.data.items,
      cashReceived: validated.data.cashReceived,
      cashierName: user.fullName || user.username,
      notes: validated.data.notes,
    });

    return NextResponse.json({
      success: true,
      data: result.transaction,
      cashReceived: result.cashReceived,
      cashChange: result.cashChange,
      message: `Transaksi kasir toko berhasil diproses (Kembalian: Rp${result.cashChange.toLocaleString("id-ID")})`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memproses transaksi kasir toko");
  }
}
