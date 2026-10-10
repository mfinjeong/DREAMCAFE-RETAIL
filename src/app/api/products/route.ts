import { NextResponse } from "next/server";
import { listProducts, listCategories, createProduct } from "@/services/product.service";

export async function GET(request: Request) {
  try {
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
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server saat memuat produk";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = await createProduct(body);

    return NextResponse.json({
      success: true,
      data: product,
      message: `Produk ${product.name} berhasil ditambahkan`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menambahkan produk";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
