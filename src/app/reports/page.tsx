"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ComprehensiveReportDTO, TransactionRecord } from "@/lib/types";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import {
  RotateCcw,
  Calendar,
  Search,
  Loader2,
  TrendingUp,
  Gamepad2,
  ShoppingBag,
  Users,
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ComprehensiveReportDTO | null>(null);
  const [period, setPeriod] = useState<"today" | "yesterday" | "this_week" | "this_month" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "stations" | "store" | "bookings_members" | "transactions">("overview");
  const [searchTransactionQuery, setSearchTransactionQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("period", period);
      if (period === "custom") {
        if (customStartDate) queryParams.set("startDate", customStartDate);
        if (customEndDate) queryParams.set("endDate", customEndDate);
      }

      const res = await fetch(`/api/reports?${queryParams.toString()}`);
      const json = await res.json();

      if (!json.success) {
        setErrorMsg(json.message || "Failed to load reports");
      } else {
        setReportData(json.data);
        if (period !== "custom") {
          setCustomStartDate(json.data.startDate);
          setCustomEndDate(json.data.endDate);
        }
      }
    } catch {
      setErrorMsg("Failed to communicate with report server");
    } finally {
      setIsLoading(false);
    }
  }, [period, customStartDate, customEndDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredTransactions = useMemo(() => {
    if (!reportData?.recentTransactions) return [];
    if (!searchTransactionQuery.trim()) return reportData.recentTransactions;
    const q = searchTransactionQuery.toLowerCase();
    return reportData.recentTransactions.filter(
      (t) =>
        t.invoiceNumber.toLowerCase().includes(q) ||
        (t.memberName && t.memberName.toLowerCase().includes(q)) ||
        (t.cashierName && t.cashierName.toLowerCase().includes(q)) ||
        t.type.toLowerCase().includes(q)
    );
  }, [reportData?.recentTransactions, searchTransactionQuery]);

  const rev = reportData?.revenueSummary;
  const sess = reportData?.sessionAnalytics;
  const stat = reportData?.stationUtilization;
  const prod = reportData?.productAnalytics;
  const inv = reportData?.inventoryAnalytics;
  const book = reportData?.bookingAnalytics;
  const mem = reportData?.memberAnalytics;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-persona-red persona-slash" />
          <div>
            <h2 className="text-sm font-bold text-text-primary tracking-tight font-sans">
              Financial Reports & Analytics
            </h2>
            <div className="text-[11px] font-mono text-text-muted">
              {reportData ? `${reportData.startDate} s/d ${reportData.endDate} (WIB / Asia/Jakarta)` : "Loading..."}
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-surface border border-surface-border rounded-[6px] p-0.5 flex items-center">
            {(["today", "yesterday", "this_week", "this_month", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs font-mono rounded-[4px] capitalize transition-colors ${
                  period === p
                    ? "bg-persona-red text-white font-semibold shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {p.replace("_", " ")}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => fetchReports()} disabled={isLoading}>
            <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin text-persona-red" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Custom Date Selector */}
      {period === "custom" && (
        <div className="bg-surface border border-surface-border rounded-[6px] p-2.5 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-muted font-mono">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-surface-muted border border-surface-border rounded-[4px] px-2 py-0.5 text-text-primary focus:outline-none focus:border-persona-red font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted font-mono">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-surface-muted border border-surface-border rounded-[4px] px-2 py-0.5 text-text-primary focus:outline-none focus:border-persona-red font-mono"
            />
          </div>
          <Button variant="primary" size="sm" onClick={() => fetchReports()}>
            Apply Date Range
          </Button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red">
          {errorMsg}
        </div>
      )}

      {/* Primary Metric Cards (Preserved DREAMCAFE Visual Hierarchy) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-surface border border-surface-border rounded-[6px] border-t-2 border-t-persona-red relative overflow-hidden">
          <span className="text-[10px] font-mono uppercase text-text-muted font-semibold block tracking-wider">
            Total Revenue (Cash)
          </span>
          <span className="text-xl font-bold font-mono text-text-primary mt-1 block">
            {formatRupiah(rev?.totalRevenue || 0)}
          </span>
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mt-2 pt-2 border-t border-surface-border">
            <span>Trx: {rev?.totalTransactions || 0}</span>
            <span>Avg: {formatRupiah(rev?.averageTransactionValue || 0)}</span>
          </div>
        </div>

        <div className="p-3.5 bg-surface border border-surface-border rounded-[6px] border-t-2 border-t-p3r-blue relative overflow-hidden">
          <span className="text-[10px] font-mono uppercase text-text-muted font-semibold block tracking-wider">
            Station Sessions
          </span>
          <span className="text-xl font-bold font-mono text-text-primary mt-1 block">
            {formatRupiah(rev?.sessionRevenue || 0)}
          </span>
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mt-2 pt-2 border-t border-surface-border">
            <span>Sessions: {sess?.totalSessions || 0}</span>
            <span>Play: {sess?.totalPlayHours || 0} hrs</span>
          </div>
        </div>

        <div className="p-3.5 bg-surface border border-surface-border rounded-[6px] border-t-2 border-t-surface-border-light relative overflow-hidden">
          <span className="text-[10px] font-mono uppercase text-text-muted font-semibold block tracking-wider">
            Store & POS
          </span>
          <span className="text-xl font-bold font-mono text-text-primary mt-1 block">
            {formatRupiah(rev?.storeRevenue || 0)}
          </span>
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mt-2 pt-2 border-t border-surface-border">
            <span>Units Sold: {prod?.totalUnitsSold || 0}</span>
            <span>Mixed: {formatRupiah(rev?.mixedRevenue || 0)}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-surface-border overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-surface text-persona-red border border-surface-border"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Overview & Daily Trend
        </button>

        <button
          onClick={() => setActiveTab("stations")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors whitespace-nowrap ${
            activeTab === "stations"
              ? "bg-surface text-persona-red border border-surface-border"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          Station Utilization
        </button>

        <button
          onClick={() => setActiveTab("store")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors whitespace-nowrap ${
            activeTab === "store"
              ? "bg-surface text-persona-red border border-surface-border"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Store & Products
        </button>

        <button
          onClick={() => setActiveTab("bookings_members")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors whitespace-nowrap ${
            activeTab === "bookings_members"
              ? "bg-surface text-persona-red border border-surface-border"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Bookings & Members
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors whitespace-nowrap ${
            activeTab === "transactions"
              ? "bg-surface text-persona-red border border-surface-border"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Transaction History ({reportData?.recentTransactions.length || 0})
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
          <Loader2 className="w-6 h-6 animate-spin text-persona-red" />
          <span className="text-xs font-mono">Aggregating real database reports...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & DAILY TREND */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Channel Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Session Trx</span>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {formatRupiah(rev?.sessionRevenue || 0)}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {rev?.sessionCount || 0} Transactions
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Store Trx</span>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {formatRupiah(rev?.storeRevenue || 0)}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {rev?.storeCount || 0} Transactions
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Mixed Trx</span>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {formatRupiah(rev?.mixedRevenue || 0)}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {rev?.mixedCount || 0} Transactions
                  </span>
                </div>
              </div>

              {/* Daily Revenue Aggregation Table */}
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-text-muted block font-semibold">
                  Daily Revenue Aggregation (Asia/Jakarta Calendar)
                </span>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Trx Count</TableHead>
                      <TableHead>Station Rev</TableHead>
                      <TableHead>Store Rev</TableHead>
                    </TableRow>
                  </TableHeader>
                  <tbody>
                    {!reportData?.dailyRevenue || reportData.dailyRevenue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-text-muted text-xs">
                          No transactions recorded in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.dailyRevenue.map((d) => (
                        <TableRow key={d.date}>
                          <TableCell className="font-mono text-xs font-semibold text-text-primary">
                            {d.date}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-persona-red">
                            {formatRupiah(d.revenue)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-text-secondary">
                            {d.transactionCount}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-p3r-blue">
                            {formatRupiah(d.sessionRevenue)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-emerald-400">
                            {formatRupiah(d.storeRevenue)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 2: STATION UTILIZATION */}
          {activeTab === "stations" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">PC Play Hours</span>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {sess?.pcPlayHours || 0} hrs
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {sess?.pcSessionsCount || 0} Sessions ({formatRupiah(sess?.pcRevenue || 0)})
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Console Play Hours</span>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {sess?.consolePlayHours || 0} hrs
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {sess?.consoleSessionsCount || 0} Sessions ({formatRupiah(sess?.consoleRevenue || 0)})
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Most Active PC</span>
                  <div className="text-base font-bold font-mono text-persona-red mt-0.5">
                    {stat?.mostUsedPC || "None"}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    Most Active Console: {stat?.mostUsedConsole || "None"}
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Avg Session Duration</span>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {sess?.averageDurationMinutes || 0} mins
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    Active Sessions: {sess?.activeSessions || 0}
                  </span>
                </div>
              </div>

              {/* Station Performance Ranking */}
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-text-muted block font-semibold">
                  Station Performance & Utilization Ranking
                </span>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Play Hours</TableHead>
                      <TableHead>Revenue Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <tbody>
                    {!stat?.stations || stat.stations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-text-muted text-xs">
                          No stations found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stat.stations.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-extrabold text-[#F2F3F5] font-sans">
                            {s.stationNumber} ({s.name})
                          </TableCell>
                          <TableCell className="font-mono text-xs text-text-muted">
                            <span className="px-1.5 py-0.5 bg-surface-muted rounded border border-surface-border">
                              {s.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-text-primary font-bold">
                            {s.sessionCount}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-text-secondary">
                            {s.totalPlayHours} hrs
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-persona-red">
                            {formatRupiah(s.revenue)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 3: STORE & PRODUCTS */}
          {activeTab === "store" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Store Revenue</span>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {formatRupiah(prod?.storeRevenue || 0)}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {prod?.totalUnitsSold || 0} Units Sold
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Stock In / Out</span>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    +{inv?.stockInUnits || 0} / -{inv?.stockOutUnits || 0}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {inv?.adjustmentCount || 0} Stock Audits
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Low Stock Alerts</span>
                  <div className="text-base font-bold font-mono text-persona-red mt-0.5">
                    {inv?.lowStockProducts || 0} Low / {inv?.outOfStockProducts || 0} Empty
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    Critical stock items
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Total Inventory Value</span>
                  <div className="text-base font-bold font-mono text-[#F2F3F5] mt-0.5">
                    {formatRupiah(inv?.totalValuation || 0)}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    Based on costPrice
                  </span>
                </div>
              </div>

              {/* Top Products Table */}
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-text-muted block font-semibold">
                  Top-Selling Products
                </span>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Units Sold</TableHead>
                      <TableHead>Average Price</TableHead>
                      <TableHead>Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <tbody>
                    {!prod?.topProducts || prod.topProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-text-muted text-xs">
                          No product sales recorded in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      prod.topProducts.map((p) => (
                        <TableRow key={p.productId}>
                          <TableCell className="font-semibold text-text-primary text-xs">
                            {p.productName}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-text-muted">
                            {p.categoryName || "General"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-text-primary font-bold">
                            {p.unitsSold}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-text-secondary">
                            {formatRupiah(p.averagePrice)}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-persona-red">
                            {formatRupiah(p.revenue)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 4: BOOKINGS & MEMBERS */}
          {activeTab === "bookings_members" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Total Reservations</span>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {book?.totalBookings || 0}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    Completion: {book?.completionRate || 0}%
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Booking Status</span>
                  <div className="text-xs font-mono text-text-secondary mt-1 space-y-0.5">
                    <div>Confirmed: {book?.confirmedBookings || 0}</div>
                    <div>Completed: {book?.completedBookings || 0}</div>
                    <div>Cancelled: {book?.cancelledBookings || 0}</div>
                  </div>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Active Members</span>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    {mem?.activeMembers || 0} / {mem?.totalMembers || 0}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    +{mem?.newMembers || 0} new in period
                  </span>
                </div>

                <div className="p-3 bg-surface border border-surface-border rounded-[6px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Member vs Guest Revenue</span>
                  <div className="text-xs font-mono text-text-secondary mt-1 space-y-0.5">
                    <div>Member: {formatRupiah(mem?.memberRevenue || 0)}</div>
                    <div>Guest: {formatRupiah(mem?.guestRevenue || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TRANSACTION RECORDS (ORIGINAL TABLE PRESERVED) */}
          {activeTab === "transactions" && (
            <div className="space-y-3">
              <div className="bg-surface border border-surface-border rounded-[6px] px-3 py-2 flex items-center justify-between">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search invoice, member..."
                    value={searchTransactionQuery}
                    onChange={(e) => setSearchTransactionQuery(e.target.value)}
                    className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-persona-red"
                  />
                </div>
                <span className="text-xs font-mono text-text-muted">
                  Showing {filteredTransactions.length} of {reportData?.recentTransactions.length || 0} Records
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Cashier</TableHead>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-text-muted text-xs">
                        No transactions found for this query.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((trx) => (
                      <TableRow key={trx.id}>
                        <TableCell className="font-mono text-xs font-semibold text-text-primary">
                          {trx.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-[11px] font-mono text-text-muted">
                          {formatDateTime(trx.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs text-text-primary font-medium">
                          {trx.memberName || "Guest"}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-text-muted">
                          {trx.type}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-persona-red">
                          {formatRupiah(trx.totalAmount)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-text-muted">
                          {formatRupiah(trx.cashReceived)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-p3r-blue font-medium">
                          {formatRupiah(trx.cashChange)}
                        </TableCell>
                        <TableCell className="text-xs text-text-dim">{trx.cashierName}</TableCell>
                      </TableRow>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
