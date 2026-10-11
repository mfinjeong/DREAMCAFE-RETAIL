import { NextResponse } from "next/server";
import { listProducts, listCategories, createProduct } from "@/services/product.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";
import { productSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("q");
    const stockStatus = searchParams.get("stockStatus");
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";

    const [products, categories] = await Promise.all([
      listProducts({ categoryId, search, stockStatus, lowStockOnly }),
      listCategories(),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      categories,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server saat memuat produk", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["ADMIN", "OPERATOR"]);
    const body = await request.json();
    const validated = productSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const product = await createProduct(validated.data);

    return NextResponse.json({
      success: true,
      data: product,
      message: `Produk ${product.name} berhasil ditambahkan`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal menambahkan produk", 400);
  }
}
