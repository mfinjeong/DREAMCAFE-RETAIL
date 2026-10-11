import { NextResponse } from "next/server";
import { checkoutSession } from "@/services/session.service";
import { sessionCheckoutWithProductsSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const validated = sessionCheckoutWithProductsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await checkoutSession({
      sessionId: validated.data.sessionId,
      products: validated.data.products,
      cashReceived: validated.data.cashReceived,
      cashierName: user.fullName || user.username,
      notes: validated.data.notes,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Checkout biling berhasil (Kembalian: Rp${result.cashChange.toLocaleString("id-ID")})`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal menyelesaikan sesi");
  }
}
