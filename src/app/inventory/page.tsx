"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProductItem, ProductCategoryItem, InventoryLogItem, InventorySummaryDTO } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import {
  Search,
  Plus,
  Minus,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  Package,
  Boxes,
  AlertCircle,
  Check,
  History,
} from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [summary, setSummary] = useState<InventorySummaryDTO | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("ALL");
  const [logActionFilter, setLogActionFilter] = useState<string>("ALL");
  const [logProductFilter, setLogProductFilter] = useState<string>("ALL");

  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [actionType, setActionType] = useState<"STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT">("STOCK_IN");
  const [adjustQuantity, setAdjustQuantity] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>("Restock pasokan");
  const [recordedBy, setRecordedBy] = useState<string>("Admin");
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.append("categoryId", selectedCategory);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (stockStatusFilter !== "ALL") params.append("stockStatus", stockStatusFilter);

      const logParams = new URLSearchParams();
      if (logProductFilter !== "ALL") logParams.append("productId", logProductFilter);
      if (logActionFilter !== "ALL") logParams.append("action", logActionFilter);

      const [prodRes, logRes, sumRes] = await Promise.all([
        fetch(`/api/products?${params.toString()}`),
        fetch(`/api/inventory/logs?${logParams.toString()}`),
        fetch("/api/inventory/summary"),
      ]);

      const [prodJson, logJson, sumJson] = await Promise.all([
        prodRes.json(),
        logRes.json(),
        sumRes.json(),
      ]);

      if (prodJson.success) {
        setProducts(prodJson.data || []);
        if (prodJson.categories) setCategories(prodJson.categories);
        if (!selectedProductId && prodJson.data.length > 0) {
          setSelectedProductId(prodJson.data[0].id);
        }
      } else {
        throw new Error(prodJson.message || "Gagal memuat katalog produk");
      }

      if (logJson.success) {
        setLogs(logJson.data || []);
      }

      if (sumJson.success) {
        setSummary(sumJson.data);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal terhubung ke database inventaris";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, stockStatusFilter, logProductFilter, logActionFilter, selectedProductId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAdjust = (
    prod?: ProductItem,
    defaultAction: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" = "STOCK_IN"
  ) => {
    if (prod) {
      setSelectedProductId(prod.id);
      if (defaultAction === "ADJUSTMENT") {
        setAdjustQuantity(prod.stock);
      } else if (defaultAction === "STOCK_OUT") {
        setAdjustQuantity(Math.min(5, prod.stock));
      } else {
        setAdjustQuantity(10);
      }
    } else {
      const current = products.find((p) => p.id === selectedProductId) || products[0];
      if (current) {
        setSelectedProductId(current.id);
        setAdjustQuantity(defaultAction === "ADJUSTMENT" ? current.stock : 10);
      }
    }

    setActionType(defaultAction);
    setAdjustReason(
      defaultAction === "STOCK_IN"
        ? "Restock pengadaan barang"
        : defaultAction === "STOCK_OUT"
        ? "Barang rusak / kadaluarsa"
        : "Opname fisik berkala"
    );
    setRecordedBy("Admin");
    setModalError(null);
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSuccessMsg(null);

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) {
      setModalError("Pilih produk terlebih dahulu");
      return;
    }

    const qty = Number(adjustQuantity);
    if (!Number.isInteger(qty)) {
      setModalError("Jumlah harus bilangan bulat");
      return;
    }

    if (actionType === "STOCK_IN" && qty <= 0) {
      setModalError("Jumlah penambahan stok harus lebih dari 0");
      return;
    }

    if (actionType === "STOCK_OUT") {
      if (qty <= 0) {
        setModalError("Jumlah pengurangan stok harus lebih dari 0");
        return;
      }
      if (qty > product.stock) {
        setModalError(`Jumlah melebihi stok tersedia (${product.stock} ${product.unit})`);
        return;
      }
    }

    if (actionType === "ADJUSTMENT" && qty < 0) {
      setModalError("Stok fisik hasil opname tidak boleh negatif");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          action: actionType,
          quantity: qty,
          reason: adjustReason.trim(),
          recordedBy: recordedBy.trim() || "Admin",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setModalError(json.message || "Gagal memperbarui stok");
        return;
      }

      setSuccessMsg(json.message || "Stok inventaris berhasil diperbarui");
      setAdjustModalOpen(false);
      await fetchData();
    } catch {
      setModalError("Gangguan koneksi ke server saat memproses penyesuaian stok.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;
  const currentStock = selectedProduct ? selectedProduct.stock : 0;
  const projectedStock =
    actionType === "STOCK_IN"
      ? currentStock + Number(adjustQuantity || 0)
      : actionType === "STOCK_OUT"
      ? currentStock - Number(adjustQuantity || 0)
      : Number(adjustQuantity || 0);

  const adjustmentDifference = selectedProduct ? Number(adjustQuantity || 0) - selectedProduct.stock : 0;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></span>
          <h2 className="text-xs font-bold text-[#F2F3F5] uppercase tracking-wider font-sans">
            Inventory & Supply Control
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenAdjust(undefined, "STOCK_IN")}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-p3r-blue" />
            Stock In
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenAdjust(undefined, "STOCK_OUT")}
            className="flex items-center gap-1.5"
          >
            <Minus className="w-3.5 h-3.5 text-pamber" />
            Stock Out
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAdjust(undefined, "ADJUSTMENT")}
            className="flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Stock Audit
          </Button>
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="p-1.5 rounded-[6px] text-text-secondary hover:text-[#F2F3F5] bg-surface border border-surface-border cursor-pointer transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-3 bg-persona-red-subtle border border-persona-red-border rounded-[8px] flex items-center justify-between text-xs text-persona-red">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-text-muted hover:text-persona-red text-xs underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-p3r-blue-subtle border border-p3r-blue-border rounded-[8px] flex items-center justify-between text-xs text-p3r-blue">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-text-muted hover:text-p3r-blue text-xs underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
        <div className="bg-surface border border-surface-border p-3 rounded-[8px] space-y-1">
          <div className="text-[11px] text-text-muted flex items-center justify-between">
            <span>Total Produk</span>
            <Package className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <div className="text-lg font-extrabold text-[#F2F3F5]">
            {summary ? summary.totalProducts : products.length}
          </div>
          <div className="text-[10px] text-text-secondary font-sans">Katalog aktif</div>
        </div>

        <div className="bg-surface border border-surface-border p-3 rounded-[8px] space-y-1">
          <div className="text-[11px] text-text-muted flex items-center justify-between">
            <span>Total Stok Fisik</span>
            <Boxes className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <div className="text-lg font-extrabold text-[#F2F3F5]">
            {summary ? summary.totalStock : products.reduce((acc, p) => acc + p.stock, 0)}{" "}
            <span className="text-xs font-normal text-text-muted">pcs</span>
          </div>
          <div className="text-[10px] text-text-secondary font-sans">Semua unit produk</div>
        </div>

        <div className="bg-surface border border-surface-border p-3 rounded-[8px] space-y-1">
          <div className="text-[11px] text-text-muted flex items-center justify-between">
            <span>Stok Rendah</span>
            <AlertTriangle className="w-3.5 h-3.5 text-pamber" />
          </div>
          <div className="text-lg font-extrabold text-pamber">
            {summary ? summary.lowStockProducts : products.filter((p) => p.isLowStock).length}
          </div>
          <div className="text-[10px] text-text-secondary font-sans">≤ batas minimum alert</div>
        </div>

        <div className="bg-surface border border-surface-border p-3 rounded-[8px] space-y-1">
          <div className="text-[11px] text-text-muted flex items-center justify-between">
            <span>Stok Habis</span>
            <AlertCircle className="w-3.5 h-3.5 text-persona-red" />
          </div>
          <div className="text-lg font-extrabold text-persona-red">
            {summary ? summary.outOfStockProducts : products.filter((p) => p.isOutOfStock).length}
          </div>
          <div className="text-[10px] text-text-secondary font-sans">Segera lakukan restock</div>
        </div>

        <div className="bg-surface border border-surface-border p-3 rounded-[8px] space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-text-muted flex items-center justify-between">
            <span>Total Valuasi</span>
            <span className="text-[10px] text-text-muted font-mono">HPP</span>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-[#F2F3F5] truncate">
            {formatRupiah(summary ? summary.totalValuation : products.reduce((acc, p) => acc + p.costPrice * p.stock, 0))}
          </div>
          <div className="text-[10px] text-text-secondary font-sans">Modal barang tertahan</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-surface-border pb-1.5 text-xs font-sans">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-3 py-1.5 rounded-[4px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "stock"
              ? "bg-persona-red-subtle text-white border-l-2 border-persona-red"
              : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Item Stok & Pasokan ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-3 py-1.5 rounded-[4px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "history"
              ? "bg-persona-red-subtle text-white border-l-2 border-persona-red"
              : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Riwayat Audit Log ({logs.length})
        </button>
      </div>

      {activeTab === "stock" ? (
        <div className="space-y-3">
          {/* Filters for Stock Items */}
          <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex flex-col md:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari produk atau barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-[#F2F3F5] placeholder-text-muted focus:outline-none focus:border-persona-red"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1 text-xs text-[#F2F3F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1 text-xs text-[#F2F3F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="AVAILABLE">Tersedia (In Stock)</option>
                <option value="LOW_STOCK">Stok Rendah (Low)</option>
                <option value="OUT_OF_STOCK">Habis (Out of Stock)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk & Barcode</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Harga Pokok (Cost)</TableHead>
                <TableHead>Harga Jual</TableHead>
                <TableHead>Stok Fisik</TableHead>
                <TableHead>Min. Alert</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mutasi Terakhir</TableHead>
                <TableHead className="text-right">Aksi Cepat</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-text-secondary font-mono" colSpan={9}>
                    Memuat data inventaris dari database...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-text-muted font-sans" colSpan={9}>
                    Tidak ada produk yang sesuai dengan kriteria filter.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const isOut = p.stock <= 0;
                  const isLow = !isOut && p.stock <= p.minStockAlert;

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-[#F2F3F5] font-sans">
                        <div>{p.name}</div>
                        <div className="text-[10px] font-mono text-text-muted">{p.barcode || "-"}</div>
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">{p.categoryName}</TableCell>
                      <TableCell className="font-mono text-text-secondary">{formatRupiah(p.costPrice)}</TableCell>
                      <TableCell className="font-mono text-[#F2F3F5] font-semibold">
                        {formatRupiah(p.price)}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-[#F2F3F5]">
                        <span className={isOut ? "text-persona-red" : isLow ? "text-pamber" : "text-[#F2F3F5]"}>
                          {p.stock}
                        </span>{" "}
                        <span className="text-[10px] text-text-muted font-normal">{p.unit}</span>
                      </TableCell>
                      <TableCell className="font-mono text-text-secondary text-xs">
                        {p.minStockAlert} {p.unit}
                      </TableCell>
                      <TableCell>
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-persona-red-subtle text-persona-red border border-persona-red-border font-bold">
                            <span className="w-1.5 h-1.5 rounded-[1px] bg-persona-red persona-slash"></span>
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-pamber-subtle text-pamber border border-pamber-border font-bold">
                            <span className="w-1.5 h-1.5 rounded-[1px] bg-pamber persona-slash"></span>
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-p3r-blue-subtle text-p3r-blue border border-p3r-blue-border font-bold">
                            <span className="w-1.5 h-1.5 rounded-[1px] bg-p3r-blue persona-slash"></span>
                            AVAILABLE
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-text-secondary">
                        {p.lastMovement ? (
                          <div>
                            <span
                              className={`font-bold ${
                                p.lastMovement.action === "STOCK_IN"
                                  ? "text-p3r-blue"
                                  : p.lastMovement.action === "STOCK_OUT"
                                  ? "text-persona-red"
                                  : "text-pamber"
                              }`}
                            >
                              {p.lastMovement.action} ({p.lastMovement.quantity})
                            </span>
                            <div className="text-[10px] text-text-muted">{p.lastMovement.reason}</div>
                          </div>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenAdjust(p, "STOCK_IN")}
                            className="p-1 px-2 text-xs bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-[#F2F3F5] rounded-[4px] border border-surface-border font-sans font-medium cursor-pointer transition-colors"
                            title="Tambah Stok (Stock In)"
                          >
                            +In
                          </button>
                          <button
                            onClick={() => handleOpenAdjust(p, "STOCK_OUT")}
                            disabled={p.stock <= 0}
                            className={`p-1 px-2 text-xs rounded-[4px] border font-sans font-medium transition-colors ${
                              p.stock <= 0
                                ? "bg-surface-muted border-surface-border text-text-muted cursor-not-allowed"
                                : "bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-[#F2F3F5] border-surface-border cursor-pointer"
                            }`}
                            title="Kurang Stok (Stock Out)"
                          >
                            -Out
                          </button>
                          <button
                            onClick={() => handleOpenAdjust(p, "ADJUSTMENT")}
                            className="p-1 px-2 text-xs bg-persona-red hover:bg-persona-red-hover text-white rounded-[4px] font-sans font-bold cursor-pointer transition-colors"
                            title="Audit / Sesuaikan Stok Fisik"
                          >
                            Audit
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Filters for Audit History */}
          <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex flex-col md:flex-row gap-2.5 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 w-full">
              {/* Product Filter */}
              <select
                value={logProductFilter}
                onChange={(e) => setLogProductFilter(e.target.value)}
                className="bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1 text-xs text-[#F2F3F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Action Filter */}
              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1 text-xs text-[#F2F3F5] focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Aksi</option>
                <option value="STOCK_IN">STOCK_IN (Penambahan)</option>
                <option value="STOCK_OUT">STOCK_OUT (Pengurangan)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Opname Fisik)</option>
              </select>
            </div>

            <div className="text-xs font-mono text-text-secondary shrink-0">
              Total Log: <span className="text-[#F2F3F5] font-bold">{logs.length}</span>
            </div>
          </div>

          {/* Audit History Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Kuantitas</TableHead>
                <TableHead>Perubahan Stok</TableHead>
                <TableHead>Keterangan / Alasan</TableHead>
                <TableHead>Petugas</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-text-secondary font-mono" colSpan={8}>
                    Memuat catatan mutasi inventaris...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-text-muted font-sans" colSpan={8}>
                    Belum ada riwayat mutasi stok.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-[11px] font-mono text-text-secondary whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold text-[#F2F3F5] font-sans">{log.productName}</TableCell>
                    <TableCell className="text-xs text-text-secondary">{log.categoryName}</TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] border ${
                          log.action === "STOCK_IN"
                            ? "bg-p3r-blue-subtle text-p3r-blue border-p3r-blue-border"
                            : log.action === "STOCK_OUT"
                            ? "bg-persona-red-subtle text-persona-red border-persona-red-border"
                            : "bg-pamber-subtle text-pamber border-pamber-border"
                        }`}
                      >
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-[#F2F3F5]">
                      {log.action === "STOCK_IN"
                        ? `+${log.quantity}`
                        : log.action === "STOCK_OUT"
                        ? `-${log.quantity}`
                        : `${log.newStock >= log.previousStock ? "+" : ""}${log.newStock - log.previousStock}`}
                    </TableCell>
                    <TableCell className="font-mono text-text-secondary">
                      {log.previousStock} → <span className="font-bold text-[#F2F3F5]">{log.newStock}</span>
                    </TableCell>
                    <TableCell className="text-text-secondary text-xs">{log.reason}</TableCell>
                    <TableCell className="text-text-secondary text-xs font-semibold">{log.recordedBy}</TableCell>
                  </TableRow>
                ))
              )}
            </tbody>
          </Table>
        </div>
      )}

      {/* Adjust Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={
          actionType === "STOCK_IN"
            ? "Stock In (Penambahan Stok)"
            : actionType === "STOCK_OUT"
            ? "Stock Out (Pengurangan Manual)"
            : "Stock Audit (Penyesuaian Fisik Opname)"
        }
        subtitle={selectedProduct ? selectedProduct.name : undefined}
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmAdjust} className="space-y-3.5 font-sans">
          {modalError && (
            <div className="p-2.5 bg-persona-red-subtle border border-persona-red-border rounded-[6px] text-xs text-persona-red font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Produk</label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const p = products.find((x) => x.id === e.target.value);
                if (p && actionType === "ADJUSTMENT") {
                  setAdjustQuantity(p.stock);
                }
              }}
              className="w-full bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1.5 text-xs text-[#F2F3F5] focus:outline-none focus:border-persona-red cursor-pointer"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stok Saat Ini: {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Tipe Mutasi Inventaris</label>
            <select
              value={actionType}
              onChange={(e) => {
                const act = e.target.value as "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";
                setActionType(act);
                if (act === "ADJUSTMENT" && selectedProduct) {
                  setAdjustQuantity(selectedProduct.stock);
                  setAdjustReason("Opname fisik berkala");
                } else if (act === "STOCK_IN") {
                  setAdjustQuantity(10);
                  setAdjustReason("Restock pengadaan barang");
                } else if (act === "STOCK_OUT") {
                  setAdjustQuantity(selectedProduct ? Math.min(5, selectedProduct.stock) : 1);
                  setAdjustReason("Barang rusak / kadaluarsa");
                }
              }}
              className="w-full bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1.5 text-xs text-[#F2F3F5] focus:outline-none focus:border-persona-red cursor-pointer"
            >
              <option value="STOCK_IN">STOCK_IN — Penambahan Pasokan (Restock)</option>
              <option value="STOCK_OUT">STOCK_OUT — Pengurangan Manual (Rusak / Hilang / Kadaluarsa)</option>
              <option value="ADJUSTMENT">ADJUSTMENT — Hasil Opname Fisik (Penghitungan Aktual)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              {actionType === "ADJUSTMENT" ? "Jumlah Fisik Sebenarnya (Actual Count)" : "Jumlah Kuantitas (Qty)"}
            </label>
            <input
              type="number"
              min={actionType === "ADJUSTMENT" ? "0" : "1"}
              step="1"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(Number(e.target.value))}
              className="w-full bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1.5 text-xs font-mono font-bold text-[#F2F3F5] focus:outline-none focus:border-persona-red"
              required
            />
          </div>

          {/* Live Preview Mutation Box */}
          {selectedProduct && (
            <div className="p-2.5 bg-surface-muted border border-surface-border rounded-[6px] text-xs font-mono space-y-1">
              <div className="flex justify-between text-text-secondary">
                <span>Stok Sistem Saat Ini:</span>
                <span className="text-[#F2F3F5] font-bold">
                  {currentStock} {selectedProduct.unit}
                </span>
              </div>

              {actionType === "ADJUSTMENT" ? (
                <>
                  <div className="flex justify-between text-text-secondary">
                    <span>Hasil Opname Baru:</span>
                    <span className="text-[#F2F3F5] font-bold">
                      {adjustQuantity} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-surface-border font-bold">
                    <span>Selisih (Adjustment):</span>
                    <span className={adjustmentDifference < 0 ? "text-persona-red" : "text-p3r-blue"}>
                      {adjustmentDifference > 0 ? `+${adjustmentDifference}` : adjustmentDifference}{" "}
                      {selectedProduct.unit}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between pt-1 border-t border-surface-border font-bold">
                  <span>Estimasi Stok Baru:</span>
                  <span className={projectedStock < 0 ? "text-persona-red" : "text-p3r-blue"}>
                    {projectedStock} {selectedProduct.unit}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              Alasan / Nomor Referensi Dokumen
            </label>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Faktur pembelian #102 / Rusak saat unboxing / Opname shift malam"
              className="w-full bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1.5 text-xs text-[#F2F3F5] focus:outline-none focus:border-persona-red"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Petugas / Operator</label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              placeholder="e.g. Admin / Supervisor Kasir"
              className="w-full bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1.5 text-xs text-[#F2F3F5] focus:outline-none focus:border-persona-red"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setAdjustModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting || (actionType === "STOCK_OUT" && adjustQuantity > currentStock)}
            >
              Simpan Penyesuaian
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
