import { NextResponse } from "next/server";
import { getComprehensiveReports, ReportFilterParams } from "@/services/report.service";
import { reportFilterSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const validated = reportFilterSchema.safeParse({
      period,
      startDate,
      endDate,
    });

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const reports = await getComprehensiveReports(validated.data as ReportFilterParams);

    return NextResponse.json({
      success: true,
      data: {
        ...reports,
        // Backwards compatibility with earlier basic dashboard/report consumers
        totalRevenue: reports.revenueSummary.totalRevenue,
        sessionRevenue: reports.revenueSummary.sessionRevenue,
        storeRevenue: reports.revenueSummary.storeRevenue,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server saat memuat laporan finansial";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
