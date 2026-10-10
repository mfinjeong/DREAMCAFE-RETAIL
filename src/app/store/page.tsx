"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ProductItem,
  ProductCategoryItem,
  MemberItem,
  POSCartItem,
  TransactionRecord,
  SessionItem,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatRupiah, formatDateTime } from "@/lib/formatters";
import { Search, Plus, Minus, Trash2, RefreshCw, AlertCircle, ShoppingBag, Monitor, Gamepad2, Check } from "lucide-react";

export default function StorePOSPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [checkoutMode, setCheckoutMode] = useState<"DIRECT" | "SESSION">("DIRECT");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [completedTrx, setCompletedTrx] = useState<TransactionRecord | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [prodRes, memRes, sessRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/members"),
        fetch("/api/sessions?status=ACTIVE"),
      ]);

      const [prodJson, memJson, sessJson] = await Promise.all([
        prodRes.json(),
        memRes.json(),
        sessRes.json(),
      ]);

      if (prodJson.success) {
        setProducts(prodJson.data || []);
        setCategories(prodJson.categories || []);
      } else {
        throw new Error(prodJson.message || "Gagal memuat katalog produk");
      }

      if (memJson.success) {
        setMembers(memJson.data || []);
      }

      if (sessJson.success) {
        setActiveSessions(sessJson.data || []);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal terhubung ke database";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Selected session details
  const selectedSession = activeSessions.find((s) => s.id === selectedSessionId) || null;
  const sessionFee = selectedSession ? selectedSession.totalPrice : 0;

  // Cart calculation
  const cartSubtotal = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
  const finalTotal = checkoutMode === "SESSION" && selectedSession ? sessionFee + cartSubtotal : cartSubtotal;
  const cashNum = parseFloat(cashReceived) || 0;
  const change = cashNum - finalTotal;
  const isInsufficient = cashNum < finalTotal;

  const addToCart = (product: ProductItem) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (product.stock <= 0) {
      setErrorMsg(`Stok habis untuk produk: ${product.name}`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setErrorMsg(`Stok maksimal tersedia untuk ${product.name} adalah ${product.stock} ${product.unit}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setErrorMsg(null);
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              setErrorMsg(`Stok tidak mencukupi (Maksimal: ${item.product.stock})`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashReceived("");
    setSelectedSessionId("");
    setSelectedMemberId("");
    setErrorMsg(null);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (checkoutMode === "DIRECT" && cart.length === 0) {
      setErrorMsg("Keranjang belanja masih kosong.");
      return;
    }

    if (checkoutMode === "SESSION" && !selectedSessionId) {
      setErrorMsg("Pilih sesi aktif yang ingin diselesaikan.");
      return;
    }

    if (isInsufficient) {
      setErrorMsg(`Uang tunai kurang! Diterima: ${formatRupiah(cashNum)}, Total Tagihan: ${formatRupiah(finalTotal)}`);
      return;
    }

    try {
      setIsProcessing(true);

      if (checkoutMode === "SESSION" && selectedSessionId) {
        // Combined Session + Store checkout
        const payload = {
          sessionId: selectedSessionId,
          products: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
          cashReceived: cashNum,
          cashierName: "Admin",
          notes: `Pembayaran Checkout Kasir Sesi + Toko DREAMCAFE`,
        };

        const res = await fetch("/api/sessions/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!json.success) {
          setErrorMsg(json.message || "Gagal memproses checkout sesi");
          return;
        }

        setCompletedTrx(json.data.transaction);
        setSuccessMsg(json.message || "Checkout sesi & produk berhasil diselesaikan!");
        clearCart();
        await fetchData();
      } else {
        // Direct Store checkout
        const payload = {
          memberId: selectedMemberId || null,
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
          cashReceived: cashNum,
          cashierName: "Admin",
          notes: "Penjualan Toko / POS DREAMCAFE",
        };

        const res = await fetch("/api/pos/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!json.success) {
          setErrorMsg(json.message || "Gagal memproses pembayaran kasir");
          return;
        }

        setCompletedTrx(json.data);
        setSuccessMsg(json.message || "Transaksi kasir toko berhasil!");
        clearCart();
        await fetchData();
      }
    } catch {
      setErrorMsg("Terjadi gangguan koneksi saat memproses checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-persona-red persona-slash rounded-[1px]"></span>
          <h2 className="text-xs font-bold text-[#F2F3F5] uppercase tracking-wider font-sans">
            Store & Cash Register
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="p-1.5 rounded-[6px] text-text-secondary hover:text-[#F2F3F5] bg-surface border border-surface-border cursor-pointer transition-colors"
            title="Refresh Catalog"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Product Catalog */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filter Bar */}
          <div className="bg-surface border border-surface-border rounded-[8px] px-3.5 py-2.5 flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari produk, minuman, makanan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-[#F2F3F5] placeholder-text-muted focus:outline-none focus:border-persona-red"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-persona-red text-white"
                    : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
                }`}
              >
                SEMUA
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === c.id
                      ? "bg-persona-red text-white"
                      : "text-text-secondary hover:text-[#F2F3F5] hover:bg-surface-hover"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="bg-surface border border-surface-border rounded-[8px] p-12 text-center text-text-secondary font-mono text-xs">
              Memuat katalog produk dari database...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-[8px] p-12 text-center text-text-muted font-sans text-xs">
              Tidak ada produk yang cocok dengan pencarian atau kategori ini.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const isLow = p.stock <= p.minStockAlert;
                const isOut = p.stock <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOut && addToCart(p)}
                    className={`p-3 rounded-[8px] border bg-surface flex flex-col justify-between transition-colors select-none ${
                      isOut
                        ? "opacity-45 border-surface-border cursor-not-allowed bg-surface-muted/50"
                        : "border-surface-border hover:border-surface-hover cursor-pointer"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary mb-1">
                        <span className="truncate max-w-[90px]">{p.categoryName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isOut
                              ? "bg-persona-red-subtle text-persona-red font-bold"
                              : isLow
                              ? "bg-pamber/10 text-pamber font-bold"
                              : "bg-surface-muted text-text-secondary"
                          }`}
                        >
                          {isOut ? "HABIS" : `Stok: ${p.stock}`}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[#F2F3F5] line-clamp-2 font-sans mt-0.5">
                        {p.name}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-surface-border flex items-center justify-between text-xs font-mono">
                      <span className="font-extrabold text-[#F2F3F5]">{formatRupiah(p.price)}</span>
                      <button
                        type="button"
                        disabled={isOut}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOut) addToCart(p);
                        }}
                        className={`p-1 rounded-[4px] border transition-colors cursor-pointer ${
                          isOut
                            ? "bg-surface-muted border-surface-border text-text-muted cursor-not-allowed"
                            : "bg-surface-muted hover:bg-persona-red text-text-secondary hover:text-white border-surface-border"
                        }`}
                        title={isOut ? "Stok habis" : "Tambah ke keranjang"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: POS Cart & Cashier Console */}
        <div className="bg-surface border border-surface-border rounded-[8px] p-3.5 h-fit flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-surface-border">
              <span className="text-xs font-bold text-[#F2F3F5] uppercase tracking-wider font-sans flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-persona-red" />
                Keranjang Kasir ({cart.reduce((a, b) => a + b.quantity, 0)})
              </span>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-text-secondary hover:text-persona-red cursor-pointer font-medium"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {/* Sale Mode Selector: Direct vs Session Attach */}
            <div className="pt-2 pb-1">
              <div className="text-[11px] font-mono text-text-secondary mb-1 uppercase tracking-wider">
                Mode Penjualan:
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutMode("DIRECT");
                    setSelectedSessionId("");
                  }}
                  className={`py-1.5 px-2 rounded-[4px] text-xs font-sans font-semibold border text-center transition-colors cursor-pointer ${
                    checkoutMode === "DIRECT"
                      ? "bg-persona-red border-persona-red text-white"
                      : "bg-surface-muted border-surface-border text-text-secondary hover:text-[#F2F3F5]"
                  }`}
                >
                  Toko Langsung
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutMode("SESSION")}
                  className={`py-1.5 px-2 rounded-[4px] text-xs font-sans font-semibold border text-center transition-colors cursor-pointer ${
                    checkoutMode === "SESSION"
                      ? "bg-persona-red border-persona-red text-white"
                      : "bg-surface-muted border-surface-border text-text-secondary hover:text-[#F2F3F5]"
                  }`}
                >
                  Gabung Sesi Aktif
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="py-2 space-y-1.5 max-h-48 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-muted">
                  Keranjang belanja masih kosong
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2 bg-surface-muted border border-surface-border rounded-[6px] flex items-center justify-between text-xs"
                  >
                    <div className="truncate min-w-0 flex-1">
                      <div className="text-[#F2F3F5] font-semibold truncate font-sans">{item.product.name}</div>
                      <div className="text-[11px] font-mono text-text-secondary">
                        {formatRupiah(item.product.price)} x {item.quantity} = {formatRupiah(item.product.price * item.quantity)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 rounded-[3px] bg-surface text-text-secondary hover:text-[#F2F3F5] border border-surface-border cursor-pointer"
                        title="Kurangi"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-bold w-4 text-center text-[#F2F3F5]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 rounded-[3px] bg-surface text-text-secondary hover:text-[#F2F3F5] border border-surface-border cursor-pointer"
                        title="Tambah"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-text-muted hover:text-persona-red ml-0.5 cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer / Session Selectors */}
            {checkoutMode === "DIRECT" ? (
              <div className="pt-2 border-t border-surface-border">
                <label className="text-[11px] font-mono text-text-secondary mb-1 block">
                  Member / Pelanggan:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1.5 text-xs text-[#F2F3F5] focus:outline-none cursor-pointer"
                >
                  <option value="">Guest (Tamu Non-Member)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} (@{m.username}) — [{m.tier}]
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="pt-2 border-t border-surface-border space-y-2">
                <label className="text-[11px] font-mono text-text-secondary mb-1 block">
                  Pilih Sesi Rental Aktif:
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full bg-surface-muted border border-surface-border rounded-[6px] px-2.5 py-1.5 text-xs text-[#F2F3F5] focus:outline-none cursor-pointer"
                >
                  <option value="">-- Pilih Sesi Aktif --</option>
                  {activeSessions.map((s) => {
                    const station = s.pcStationNumber || s.consoleStationNumber || "Station";
                    const user = s.memberName || s.guestName || "Guest";
                    return (
                      <option key={s.id} value={s.id}>
                        {station} — {user} ({formatRupiah(s.totalPrice)})
                      </option>
                    );
                  })}
                </select>

                {selectedSession && (
                  <div className="p-2 bg-surface-muted border border-surface-border rounded-[6px] text-xs font-mono space-y-1">
                    <div className="flex justify-between text-text-secondary">
                      <span>Station:</span>
                      <span className="text-[#F2F3F5] font-bold">
                        {selectedSession.pcStationNumber || selectedSession.consoleStationNumber}
                      </span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>User:</span>
                      <span className="text-[#F2F3F5]">
                        {selectedSession.memberName || selectedSession.guestName || "Guest"}
                      </span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Tarif Sesi:</span>
                      <span className="text-persona-red font-bold">
                        {formatRupiah(selectedSession.totalPrice)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Checkout & Cash Calculation Form */}
          <form onSubmit={handleCheckout} className="pt-3 border-t border-surface-border mt-2 space-y-2.5">
            {/* Bill Breakdown */}
            <div className="space-y-1 font-mono text-xs">
              {checkoutMode === "SESSION" && selectedSession && (
                <>
                  <div className="flex justify-between text-text-secondary">
                    <span>Sesi Rental:</span>
                    <span className="text-[#F2F3F5] font-semibold">{formatRupiah(sessionFee)}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Belanja Toko:</span>
                    <span className="text-[#F2F3F5] font-semibold">{formatRupiah(cartSubtotal)}</span>
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between pt-1 border-t border-surface-border">
                <span className="text-xs text-text-secondary font-bold uppercase tracking-wider">
                  Total Tagihan:
                </span>
                <span className="text-base font-extrabold text-[#F2F3F5]">
                  {formatRupiah(finalTotal)}
                </span>
              </div>
            </div>

            {/* Cash Input */}
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="Jumlah Uang Tunai"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full bg-surface-muted border border-surface-border rounded-[6px] pl-9 pr-2.5 py-1.5 text-xs font-mono font-bold text-[#F2F3F5] focus:outline-none focus:border-persona-red"
                  required
                />
              </div>

              {/* Quick Cash Shortcuts */}
              <div className="grid grid-cols-4 gap-1.5 mt-1.5 font-mono">
                {[
                  { label: "Pas", val: finalTotal },
                  { label: "50k", val: 50000 },
                  { label: "100k", val: 100000 },
                  { label: "200k", val: 200000 },
                ].map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCashReceived(q.val.toString())}
                    className="py-1 bg-surface-muted hover:bg-surface-hover border border-surface-border text-xs text-text-secondary hover:text-[#F2F3F5] rounded-[4px] text-center cursor-pointer transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Change Display */}
            <div
              className={`p-2.5 rounded-[6px] border flex items-center justify-between font-mono text-xs ${
                cashNum === 0
                  ? "bg-surface-muted border-surface-border text-text-secondary"
                  : isInsufficient
                  ? "bg-persona-red-subtle border-persona-red-border text-persona-red"
                  : "bg-p3r-blue-subtle border-p3r-blue-border text-p3r-blue font-bold"
              }`}
            >
              <span>{isInsufficient ? "Kurang Bayar:" : "Kembalian:"}</span>
              <span>
                {isInsufficient ? `Rp${Math.abs(change).toLocaleString("id-ID")}` : formatRupiah(change)}
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full"
              disabled={
                (checkoutMode === "DIRECT" && cart.length === 0) ||
                (checkoutMode === "SESSION" && !selectedSessionId) ||
                isInsufficient ||
                isProcessing
              }
              isLoading={isProcessing}
            >
              {checkoutMode === "SESSION" ? "Konfirmasi Checkout Sesi & Toko" : "Konfirmasi Pembayaran Kasir"}
            </Button>
          </form>
        </div>
      </div>

      {/* Payment Receipt Modal */}
      <Modal
        isOpen={!!completedTrx}
        onClose={() => setCompletedTrx(null)}
        title="Struk Pembayaran Kasir"
        subtitle={completedTrx?.invoiceNumber}
        maxWidth="sm"
      >
        {completedTrx && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-surface-muted rounded-[6px] border border-surface-border space-y-1.5">
              <div className="flex justify-between text-text-secondary">
                <span>Tanggal:</span>
                <span className="text-[#F2F3F5] font-semibold">{formatDateTime(completedTrx.createdAt)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Pelanggan:</span>
                <span className="text-[#F2F3F5] font-semibold">{completedTrx.memberName || "Guest (Tamu)"}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Metode:</span>
                <span className="text-persona-red font-bold">CASH ONLY (TUNAI)</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Tipe:</span>
                <span className="text-[#F2F3F5] font-semibold">{completedTrx.type}</span>
              </div>

              <div className="pt-2 border-t border-surface-border space-y-1">
                {completedTrx.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-[#F2F3F5]">
                    <span className="truncate max-w-[180px]">
                      {it.quantity}x {it.description}
                    </span>
                    <span>{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-surface-border space-y-1">
                <div className="flex justify-between font-extrabold text-[#F2F3F5]">
                  <span>Total Tagihan:</span>
                  <span>{formatRupiah(completedTrx.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Tunai Diterima:</span>
                  <span>{formatRupiah(completedTrx.cashReceived)}</span>
                </div>
                <div className="flex justify-between text-p3r-blue font-bold">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(completedTrx.cashChange)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setCompletedTrx(null)}>
                Tutup Struk
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
