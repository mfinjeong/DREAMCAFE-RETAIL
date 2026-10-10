import { prisma } from "../src/lib/prisma";
import { PCStatus, ConsoleStatus, ConsoleType, SessionStatus, PaymentStatus, PaymentMethod, BookingStatus, InventoryAction } from "@prisma/client";
import { listPCs, getPCById, updatePCStatus } from "../src/services/pc.service";
import { listConsoles, getConsoleById, createConsole, updateConsole, updateConsoleStatus, deleteConsole } from "../src/services/console.service";
import { listMembers, getMemberById, createMember, updateMember, deleteMember, searchMembers } from "../src/services/member.service";
import { startSession, stopSession, checkoutSession, getSessionById } from "../src/services/session.service";
import { getLowStockProducts, listProducts, getProductById, createProduct } from "../src/services/product.service";
import { createPosCheckout, listTransactions, getTransactionById } from "../src/services/transaction.service";
import { adjustStock, getInventorySummary, listInventoryLogs } from "../src/services/inventory.service";
import {
  listBookings,
  getBookingById,
  getBookingAvailability,
  createBooking,
  confirmBooking,
  cancelBooking,
  startBookingSession,
  deleteBooking,
} from "../src/services/booking.service";
import {
  getComprehensiveReports,
  getRevenueSummary,
  getDailyRevenue,
  getSessionAnalytics,
  getStationUtilization,
  getBookingAnalytics,
  getMemberAnalytics,
  getProductAnalytics,
  getInventoryAnalytics,
  getJakartaDateString,
  getJakartaDateBoundaries,
  resolveDateRange,
} from "../src/services/report.service";
import {
  listGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
} from "../src/services/game.service";
import {
  calculateLevelFromXP,
  calculateXPForLevel,
  calculateXPForNextLevel,
  calculateSessionXP,
  recordSessionCompletion,
  getGamingProfile,
  getMemberGameStats,
} from "../src/services/gaming-profile.service";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("DREAMCAFE BACKEND END-TO-END VERIFICATION SUITE");
  console.log("==================================================\n");

  // -------------------------------------------------------------------
  // TEST GROUP 1: PC MANAGEMENT
  // -------------------------------------------------------------------
  console.log("▶ TEST GROUP 1: PC Management");
  const pcs = await listPCs();
  assert(Array.isArray(pcs) && pcs.length > 0, `listPCs returned ${pcs.length} stations`);

  const pc01 = pcs.find((p) => p.stationNumber === "PC 01");
  assert(Boolean(pc01), "PC 01 found in station list");
  if (!pc01) return;

  const pcDetails = await getPCById(pc01.id);
  assert(pcDetails !== null && pcDetails.id === pc01.id, "getPCById returns station details");

  // Status transition validation
  let caughtInvalidManualInUse = false;
  try {
    // Attempting to manually set IN_USE without active session
    await updatePCStatus(pc01.id, PCStatus.IN_USE);
  } catch (err: unknown) {
    caughtInvalidManualInUse = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("IN_USE"), `Invalid manual transition to IN_USE prevented: "${msg}"`);
  }
  assert(caughtInvalidManualInUse, "Manual transition to IN_USE without session was rejected");

  console.log("  ✓ PC management assertions passed.\n");

  // -------------------------------------------------------------------
  // TEST GROUP 2: MEMBER SERVICE
  // -------------------------------------------------------------------
  console.log("▶ TEST GROUP 2: Member Service");
  const members = await listMembers();
  assert(Array.isArray(members) && members.length > 0, `listMembers returned ${members.length} members`);

  // Test create member with only required name (optional email/phone)
  const testName = `Tester Auto ${Date.now().toString().slice(-4)}`;
  const newMember = await createMember({
    fullName: testName,
  });
  assert(Boolean(newMember.id), `Member created with ID: ${newMember.id}`);
  assert(Boolean(newMember.memberCode.startsWith("DC-")), `Member code generated: ${newMember.memberCode}`);
  assert(newMember.phoneNumber === null, "Member phone number is null (optional)");
  assert(newMember.email === null, "Member email is null (optional)");
  assert(Boolean(newMember.username), `Username auto-generated: ${newMember.username}`);

  // Test search members
  const searchResults = await searchMembers(testName);
  assert(searchResults.some((m) => m.id === newMember.id), "searchMembers found the created member");

  // Test update member
  const updatedMember = await updateMember(newMember.id, {
    notes: "Verified test member",
  });
  assert(updatedMember.notes === "Verified test member", "updateMember successfully updated notes");

  // Test getMemberById with profile & spending calculation
  const memberDetails = await getMemberById(newMember.id);
  assert(memberDetails !== null && typeof memberDetails.totalSpending === "number", "getMemberById calculates totalSpending");

  console.log("  ✓ Member service assertions passed.\n");

  // -------------------------------------------------------------------
  // TEST GROUP 3: HAPPY PATH - SESSION LIFECYCLE & CASH CHECKOUT (12 STEPS)
  // -------------------------------------------------------------------
  console.log("▶ TEST GROUP 3: Happy Path — Session Lifecycle & Cash Checkout");

  // 1. Find an AVAILABLE PC
  const availablePC = await prisma.pC.findFirst({
    where: {
      status: PCStatus.AVAILABLE,
      sessions: { none: { status: SessionStatus.ACTIVE } },
    },
  });
  assert(Boolean(availablePC), `Step 1: Found AVAILABLE station: ${availablePC?.stationNumber}`);
  if (!availablePC) throw new Error("No available PC found");

  // 2. Find an existing member
  const existingMember = members[0];
  assert(Boolean(existingMember), `Step 2: Found member: ${existingMember.fullName} (${existingMember.memberCode})`);

  // Product to include in checkout
  const product = await prisma.product.findFirst({
    where: { stock: { gte: 5 }, isActive: true },
  });
  assert(Boolean(product), `Step 2b: Found product for checkout: ${product?.name} (Stock: ${product?.stock}, Price: Rp${product?.price})`);
  if (!product) throw new Error("No product found");

  const initialStock = product.stock;

  // 3. Start a session
  console.log(`  Starting session on ${availablePC.stationNumber} for ${existingMember.fullName}...`);
  const session = await startSession({
    stationId: availablePC.id,
    type: "PC",
    memberId: existingMember.id,
    durationMinutes: 60,
  });
  assert(Boolean(session.id), `Step 3: Session created: ${session.sessionNumber}`);

  // 4. Verify PC becomes IN_USE
  const pcAfterStart = await prisma.pC.findUnique({ where: { id: availablePC.id } });
  assert(pcAfterStart?.status === PCStatus.IN_USE, `Step 4: PC ${availablePC.stationNumber} status is now IN_USE`);

  // 5. Verify session becomes ACTIVE
  const sessionAfterStart = await getSessionById(session.id);
  assert(sessionAfterStart?.status === SessionStatus.ACTIVE, "Step 5: Session status is ACTIVE");

  // 6. Stop / Checkout the session with a product
  const productQty = 1;
  const sessionPrice = session.totalPrice; // 60 min rate
  const productSubtotal = product.price * productQty;
  const expectedTotal = sessionPrice + productSubtotal;
  const cashReceived = expectedTotal + 10000; // Overpay to test change calculation
  const expectedChange = 10000;

  console.log(`  Checking out session: Session Rp${sessionPrice} + ${product.name} Rp${productSubtotal} = Total Rp${expectedTotal}`);
  console.log(`  Cash received: Rp${cashReceived}, Expected change: Rp${expectedChange}`);

  const checkoutResult = await checkoutSession({
    sessionId: session.id,
    products: [
      {
        productId: product.id,
        quantity: productQty,
      },
    ],
    cashReceived,
    cashierName: "Test Cashier",
  });

  // 7. Verify transaction becomes PAID
  assert(checkoutResult.transaction.status === PaymentStatus.PAID, "Step 7: Transaction status is PAID");
  assert(checkoutResult.transaction.paymentMethod === PaymentMethod.CASH, "Step 7b: Payment method is CASH");

  // 8. Verify session becomes COMPLETED
  const sessionAfterCheckout = await getSessionById(session.id);
  assert(sessionAfterCheckout?.status === SessionStatus.COMPLETED, "Step 8: Session status is COMPLETED");
  assert(sessionAfterCheckout?.paymentStatus === PaymentStatus.PAID, "Step 8b: Session paymentStatus is PAID");

  // 9. Verify PC becomes AVAILABLE
  const pcAfterCheckout = await prisma.pC.findUnique({ where: { id: availablePC.id } });
  assert(pcAfterCheckout?.status === PCStatus.AVAILABLE, `Step 9: PC ${availablePC.stationNumber} status returned to AVAILABLE`);

  // 10. Verify transaction total
  assert(checkoutResult.totalAmount === expectedTotal, `Step 10: Transaction total is exactly Rp${expectedTotal}`);
  assert(checkoutResult.transaction.totalAmount === expectedTotal, `Step 10b: Saved transaction total amount is Rp${expectedTotal}`);

  // 11. Verify cash/change calculation
  assert(checkoutResult.cashChange === expectedChange, `Step 11: Change calculated is exactly Rp${expectedChange}`);

  // 12. Verify product stock decreased correctly
  const productAfterCheckout = await prisma.product.findUnique({ where: { id: product.id } });
  assert(
    productAfterCheckout?.stock === initialStock - productQty,
    `Step 12: Product stock decreased from ${initialStock} to ${productAfterCheckout?.stock}`
  );

  // Restore product stock so seed data remains intact
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: initialStock },
  });
  console.log("  ✓ Product stock restored cleanly.");

  console.log("  ✓ All 12 happy path steps verified successfully!\n");

  // -------------------------------------------------------------------
  // TEST GROUP 4: ERROR CASES & RESILIENCE
  // -------------------------------------------------------------------
  console.log("▶ TEST GROUP 4: Error Cases & Controlled Validations");

  // Error Case 1: Start session on IN_USE PC
  // Find an IN_USE PC
  const inUsePC = await prisma.pC.findFirst({ where: { status: PCStatus.IN_USE } });
  if (inUsePC) {
    let caughtInUse = false;
    try {
      await startSession({
        stationId: inUsePC.id,
        durationMinutes: 30,
        guestName: "Guest Test",
      });
    } catch (err: unknown) {
      caughtInUse = true;
      const msg = err instanceof Error ? err.message : String(err);
      assert(msg.includes("IN_USE") || msg.includes("sedang"), `Error Case 1 (IN_USE PC): "${msg}"`);
    }
    assert(caughtInUse, "Starting session on IN_USE PC properly rejected");
  }

  // Error Case 2: Start session on MAINTENANCE PC
  const maintenancePC = await prisma.pC.findFirst({ where: { status: PCStatus.MAINTENANCE } });
  if (maintenancePC) {
    let caughtMaintenance = false;
    try {
      await startSession({
        stationId: maintenancePC.id,
        durationMinutes: 30,
        guestName: "Guest Test",
      });
    } catch (err: unknown) {
      caughtMaintenance = true;
      const msg = err instanceof Error ? err.message : String(err);
      assert(msg.includes("MAINTENANCE") || msg.includes("pemeliharaan"), `Error Case 2 (MAINTENANCE PC): "${msg}"`);
    }
    assert(caughtMaintenance, "Starting session on MAINTENANCE PC properly rejected");
  }

  // Error Case 3: Stop already completed session
  let caughtAlreadyCompleted = false;
  try {
    await stopSession(session.id);
  } catch (err: unknown) {
    caughtAlreadyCompleted = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("tidak aktif") || msg.includes("selesai"), `Error Case 3 (Already completed session): "${msg}"`);
  }
  assert(caughtAlreadyCompleted, "Stopping already completed session properly rejected");

  // Error Case 4: Checkout with insufficient cash
  // Start a short test session on available PC to test checkout error
  const sessionForCashError = await startSession({
    stationId: availablePC.id,
    durationMinutes: 30,
    guestName: "Cash Error Test",
  });

  let caughtInsufficientCash = false;
  try {
    await checkoutSession({
      sessionId: sessionForCashError.id,
      cashReceived: 100, // Insufficient!
    });
  } catch (err: unknown) {
    caughtInsufficientCash = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("kurang"), `Error Case 4 (Insufficient cash): "${msg}"`);
  }
  assert(caughtInsufficientCash, "Checkout with insufficient cash properly rejected");

  // Error Case 5: Checkout with insufficient product stock
  let caughtInsufficientStock = false;
  try {
    await checkoutSession({
      sessionId: sessionForCashError.id,
      products: [
        {
          productId: product.id,
          quantity: 999999, // Exceeds stock!
        },
      ],
      cashReceived: 999999999,
    });
  } catch (err: unknown) {
    caughtInsufficientStock = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("tidak mencukupi"), `Error Case 5 (Insufficient stock): "${msg}"`);
  }
  assert(caughtInsufficientStock, "Checkout with insufficient stock properly rejected");

  // Verify that failed checkouts did not corrupt the session or PC
  const sessionAfterFailedCheckout = await getSessionById(sessionForCashError.id);
  assert(sessionAfterFailedCheckout?.status === SessionStatus.ACTIVE, "Session remains ACTIVE after failed checkouts");
  const pcAfterFailedCheckout = await prisma.pC.findUnique({ where: { id: availablePC.id } });
  assert(pcAfterFailedCheckout?.status === PCStatus.IN_USE, "PC remains IN_USE after failed checkouts");

  // Now cleanly complete this test session
  await checkoutSession({
    sessionId: sessionForCashError.id,
    cashReceived: 50000,
  });
  console.log("  ✓ Test session cleaned up and checked out.");

  // Error Case 6: Invalid member ID
  let caughtInvalidMember = false;
  try {
    await startSession({
      stationId: availablePC.id,
      durationMinutes: 30,
      memberId: "invalid-member-id-12345",
    });
  } catch (err: unknown) {
    caughtInvalidMember = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("Member tidak ditemukan"), `Error Case 6 (Invalid Member ID): "${msg}"`);
  }
  assert(caughtInvalidMember, "Start session with invalid member ID rejected");

  // Error Case 7: Invalid PC ID
  let caughtInvalidPC = false;
  try {
    await startSession({
      stationId: "invalid-pc-id-12345",
      durationMinutes: 30,
      guestName: "Guest",
    });
  } catch (err: unknown) {
    caughtInvalidPC = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("PC Station tidak ditemukan"), `Error Case 7 (Invalid PC ID): "${msg}"`);
  }
  assert(caughtInvalidPC, "Start session with invalid PC ID rejected");

  console.log("  ✓ All error cases handled with controlled application errors.\n");

  // -------------------------------------------------------------------
  // TEST GROUP 5: PRODUCT, INVENTORY & STORE / POS MANAGEMENT
  // -------------------------------------------------------------------
  console.log("▶ TEST GROUP 5: Product, Inventory & Store / POS Management");
  const lowStockProducts = await getLowStockProducts();
  assert(Array.isArray(lowStockProducts), `getLowStockProducts returned ${lowStockProducts.length} low-stock items`);

  const filteredLowStock = await listProducts({ lowStockOnly: true });
  assert(Array.isArray(filteredLowStock), `listProducts({ lowStockOnly: true }) returned ${filteredLowStock.length} items`);

  // 1. Verify getInventorySummary
  const inventorySummary = await getInventorySummary();
  assert(inventorySummary.totalProducts > 0, `getInventorySummary reports ${inventorySummary.totalProducts} active products`);
  assert(inventorySummary.totalStock > 0, `getInventorySummary reports ${inventorySummary.totalStock} total stock units`);
  assert(inventorySummary.totalValuation >= 0, `getInventorySummary valuation is Rp${inventorySummary.totalValuation.toLocaleString("id-ID")}`);

  // 2. Isolated Product Lifecycle Test
  const firstCategory = await prisma.productCategory.findFirst();
  assert(Boolean(firstCategory), "Found ProductCategory for isolated inventory tests");
  if (!firstCategory) return;

  const testProd = await createProduct({
    name: `Test Inventory SKU ${Date.now()}`,
    categoryId: firstCategory.id,
    price: 20000,
    costPrice: 12000,
    stock: 10,
    minStockAlert: 5,
    unit: "pcs",
  });
  assert(testProd.stock === 10, `Isolated test product created with initial stock: ${testProd.stock}`);

  // 3. Stock IN
  const stockInResult = await adjustStock({
    productId: testProd.id,
    action: "STOCK_IN",
    quantity: 15,
    reason: "Restock test batch #1",
    recordedBy: "InventoryTester",
  });
  assert(stockInResult.previousStock === 10, "Stock IN: previousStock was 10");
  assert(stockInResult.newStock === 25, "Stock IN: newStock increased to 25 (+15)");
  assert(stockInResult.log.action === "STOCK_IN", "Stock IN: audit log action is STOCK_IN");
  assert(stockInResult.log.quantity === 15, "Stock IN: audit log quantity is 15");

  // 4. Stock OUT
  const stockOutResult = await adjustStock({
    productId: testProd.id,
    action: "STOCK_OUT",
    quantity: 7,
    reason: "Damaged packaging loss",
    recordedBy: "InventoryTester",
  });
  assert(stockOutResult.previousStock === 25, "Stock OUT: previousStock was 25");
  assert(stockOutResult.newStock === 18, "Stock OUT: newStock decreased to 18 (-7)");
  assert(stockOutResult.log.action === "STOCK_OUT", "Stock OUT: audit log action is STOCK_OUT");
  assert(stockOutResult.log.quantity === 7, "Stock OUT: audit log quantity is 7");

  // 5. Reject STOCK_OUT greater than stock
  let caughtExcessStockOut = false;
  try {
    await adjustStock({
      productId: testProd.id,
      action: "STOCK_OUT",
      quantity: 9999,
      reason: "Attempt excess reduction",
    });
  } catch (err: unknown) {
    caughtExcessStockOut = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("tidak mencukupi"), `Reject excessive STOCK_OUT: "${msg}"`);
  }
  assert(caughtExcessStockOut, "Excessive manual STOCK_OUT was properly rejected");

  // 6. Reject Zero and Negative Quantities
  let caughtZeroStockIn = false;
  try {
    await adjustStock({
      productId: testProd.id,
      action: "STOCK_IN",
      quantity: 0,
      reason: "Zero quantity test",
    });
  } catch (err: unknown) {
    caughtZeroStockIn = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("lebih dari 0"), `Reject zero quantity STOCK_IN: "${msg}"`);
  }
  assert(caughtZeroStockIn, "Zero quantity STOCK_IN properly rejected");

  let caughtNegativeStockOut = false;
  try {
    await adjustStock({
      productId: testProd.id,
      action: "STOCK_OUT",
      quantity: -5,
      reason: "Negative quantity test",
    });
  } catch (err: unknown) {
    caughtNegativeStockOut = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("lebih dari 0"), `Reject negative quantity STOCK_OUT: "${msg}"`);
  }
  assert(caughtNegativeStockOut, "Negative quantity STOCK_OUT properly rejected");

  // 7. Adjustment Positive (Opname fisik surplus)
  const adjustPosResult = await adjustStock({
    productId: testProd.id,
    action: "ADJUSTMENT",
    quantity: 24, // Actual count is 24 (current is 18 -> diff is +6)
    reason: "Opname fisik mingguan (surplus)",
    recordedBy: "InventoryTester",
  });
  assert(adjustPosResult.previousStock === 18, "Adjustment (+): previousStock was 18");
  assert(adjustPosResult.newStock === 24, "Adjustment (+): newStock set to actual count 24");
  assert(adjustPosResult.difference === 6, "Adjustment (+): difference calculated as +6");
  assert(adjustPosResult.log.action === "ADJUSTMENT", "Adjustment (+): audit log action is ADJUSTMENT");

  // 8. Adjustment Negative (Opname fisik defisit)
  const adjustNegResult = await adjustStock({
    productId: testProd.id,
    action: "ADJUSTMENT",
    quantity: 14, // Actual count is 14 (current is 24 -> diff is -10)
    reason: "Opname fisik mingguan (defisit)",
    recordedBy: "InventoryTester",
  });
  assert(adjustNegResult.previousStock === 24, "Adjustment (-): previousStock was 24");
  assert(adjustNegResult.newStock === 14, "Adjustment (-): newStock set to actual count 14");
  assert(adjustNegResult.difference === -10, "Adjustment (-): difference calculated as -10");
  assert(adjustNegResult.log.action === "ADJUSTMENT", "Adjustment (-): audit log action is ADJUSTMENT");

  // 9. Reject Negative Resulting Stock in Adjustment
  let caughtNegativeAdjustment = false;
  try {
    await adjustStock({
      productId: testProd.id,
      action: "ADJUSTMENT",
      quantity: -3,
      reason: "Invalid negative physical count",
    });
  } catch (err: unknown) {
    caughtNegativeAdjustment = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("tidak boleh negatif"), `Reject negative resulting stock in Adjustment: "${msg}"`);
  }
  assert(caughtNegativeAdjustment, "Negative physical count in ADJUSTMENT properly rejected");

  // 10. Verify Audit History Logging
  const testProductLogs = await listInventoryLogs({ productId: testProd.id });
  assert(testProductLogs.length >= 4, `listInventoryLogs returned ${testProductLogs.length} audit logs for test product`);
  assert(testProductLogs[0].action === "ADJUSTMENT", "Latest audit log matches most recent ADJUSTMENT mutation");

  // 11. Low-Stock and Out-Of-Stock Detection
  await adjustStock({
    productId: testProd.id,
    action: "ADJUSTMENT",
    quantity: 3, // <= minStockAlert (5)
    reason: "Set low stock for detection test",
  });
  const lowStockCheck = await listProducts({ stockStatus: "LOW_STOCK" });
  assert(lowStockCheck.some((p) => p.id === testProd.id), "listProducts({ stockStatus: 'LOW_STOCK' }) detected low stock product");

  await adjustStock({
    productId: testProd.id,
    action: "ADJUSTMENT",
    quantity: 0, // Out of stock
    reason: "Set zero stock for out-of-stock detection test",
  });
  const outOfStockCheck = await listProducts({ stockStatus: "OUT_OF_STOCK" });
  assert(outOfStockCheck.some((p) => p.id === testProd.id), "listProducts({ stockStatus: 'OUT_OF_STOCK' }) detected out of stock product");

  // Clean up isolated test product and its logs
  await prisma.inventoryLog.deleteMany({ where: { productId: testProd.id } });
  await prisma.product.delete({ where: { id: testProd.id } });
  console.log("  ✓ Isolated inventory test product and audit logs cleaned up cleanly.");

  // 12. POS Compatibility & Atomic STOCK_OUT verification
  const allProducts = await listProducts({ activeOnly: true });
  assert(allProducts.length > 0, `listProducts loaded ${allProducts.length} active products`);
  const posProduct = allProducts[0];
  const posInitialStock = posProduct.stock;
  assert(posInitialStock > 0, `Selected POS product '${posProduct.name}' has available stock (${posInitialStock})`);

  // POS Cash Checkout
  const testCashReceived = posProduct.price + 10000;
  const posResult = await createPosCheckout({
    memberId: null,
    items: [{ productId: posProduct.id, quantity: 1 }],
    cashReceived: testCashReceived,
    cashierName: "Admin Test",
    notes: "Automated POS verification test",
  });

  assert(Boolean(posResult.transaction.id), `POS Checkout created invoice: ${posResult.transaction.invoiceNumber}`);
  assert(posResult.totalAmount === posProduct.price, `Authoritative total matches product price (Rp${posResult.totalAmount})`);
  assert(posResult.cashChange === 10000, `Change calculated accurately (Expected: Rp10000, Actual: Rp${posResult.cashChange})`);
  assert(posResult.transaction.paymentMethod === PaymentMethod.CASH, "Transaction payment method is CASH");
  assert(posResult.transaction.status === PaymentStatus.PAID, "Transaction status is PAID");

  // Verify stock deduction and POS inventory log mutation
  const productAfterSale = await getProductById(posProduct.id);
  assert(productAfterSale?.stock === posInitialStock - 1, `POS stock deducted from ${posInitialStock} to ${productAfterSale?.stock}`);

  const latestInventoryLog = await prisma.inventoryLog.findFirst({
    where: { productId: posProduct.id },
    orderBy: { createdAt: "desc" },
  });
  assert(latestInventoryLog?.action === "STOCK_OUT", "POS Inventory mutation log recorded with STOCK_OUT");
  assert(latestInventoryLog?.quantity === 1, "POS Inventory log recorded quantity = 1");

  // Verify listTransactions includes new POS transaction
  const transactionsList = await listTransactions({ limit: 10 });
  assert(transactionsList.length > 0, `listTransactions returned ${transactionsList.length} transactions`);
  const foundTx = transactionsList.find((t) => t.id === posResult.transaction.id);
  assert(Boolean(foundTx), "Created POS transaction found in transaction list");

  // Restore product stock and clean up test transaction
  await prisma.product.update({
    where: { id: posProduct.id },
    data: { stock: posInitialStock },
  });
  await prisma.transaction.delete({
    where: { id: posResult.transaction.id },
  });
  console.log("  ✓ POS product stock restored and test transaction cleaned up cleanly.");

  // -------------------------------------------------------------------
  // TEST GROUP 6: CONSOLE MANAGEMENT & SESSIONS
  // -------------------------------------------------------------------
  console.log("\n▶ TEST GROUP 6: Console Management & Sessions");
  const consoles = await listConsoles();
  assert(Array.isArray(consoles) && consoles.length > 0, `listConsoles returned ${consoles.length} console stations`);

  const con01 = consoles.find((c) => c.stationNumber === "CON 01");
  assert(Boolean(con01), "CON 01 found in station list");
  if (!con01) return;

  const conDetails = await getConsoleById(con01.id);
  assert(conDetails !== null && conDetails.id === con01.id, "getConsoleById returns console station details");

  // Create temporary test console
  const tempConStationNumber = `CON 9${Math.floor(Math.random() * 9)}`;
  const createdCon = await createConsole({
    stationNumber: tempConStationNumber,
    name: "PlayStation 5 Test Suite Station",
    consoleType: ConsoleType.PS5,
    status: ConsoleStatus.AVAILABLE,
    hourlyRate: 25000,
    controllersCount: 4,
    specsDisplay: 'LG OLED 55" 4K 120Hz Test',
    installedGames: ["EA Sports FC 24", "Tekken 8"],
  });
  assert(createdCon.stationNumber === tempConStationNumber, `createConsole created ${tempConStationNumber}`);

  // Update console
  const updatedCon = await updateConsole(createdCon.id, {
    hourlyRate: 30000,
    controllersCount: 2,
  });
  assert(updatedCon.hourlyRate === 30000, "updateConsole updated hourly rate to Rp30.000");

  // Validate manual transition to IN_USE without session is rejected
  let caughtConInvalidInUse = false;
  try {
    await updateConsoleStatus(createdCon.id, ConsoleStatus.IN_USE);
  } catch (err: unknown) {
    caughtConInvalidInUse = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("IN_USE"), `Invalid manual transition to IN_USE rejected: "${msg}"`);
  }
  assert(caughtConInvalidInUse, "Manual transition to IN_USE without session was properly rejected");

  // Test Console Session: Start session
  console.log(`  Starting console session on ${createdCon.stationNumber}...`);
  const conSession = await startSession({
    stationId: createdCon.id,
    type: "CONSOLE",
    guestName: "Console Tester",
    durationMinutes: 60,
    currentGame: "Tekken 8",
  });
  assert(Boolean(conSession.id), `Console session started: ${conSession.sessionNumber}`);

  // Verify console is now IN_USE
  const activeConCheck = await getConsoleById(createdCon.id);
  assert(activeConCheck?.status === ConsoleStatus.IN_USE, "Console status updated to IN_USE");
  assert(activeConCheck?.activeSession !== null, "Console reflects active session");

  // Verify duplicate active session rejection
  let caughtDuplicateCon = false;
  try {
    await startSession({
      stationId: createdCon.id,
      type: "CONSOLE",
      guestName: "Second Player",
      durationMinutes: 60,
    });
  } catch (err: unknown) {
    caughtDuplicateCon = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("IN_USE") || msg.includes("sesi aktif"), `Duplicate console session rejected: "${msg}"`);
  }
  assert(caughtDuplicateCon, "Duplicate active session on console was properly prevented");

  // Stop console session
  const stoppedConSession = await stopSession(conSession.id);
  assert(stoppedConSession.status === SessionStatus.COMPLETED, "Console session stopped and marked COMPLETED");

  // Verify console status returned to AVAILABLE
  const availableConCheck = await getConsoleById(createdCon.id);
  assert(availableConCheck?.status === ConsoleStatus.AVAILABLE, "Console status cleanly returned to AVAILABLE");

  // Delete temporary test console
  await deleteConsole(createdCon.id);
  const deletedCheck = await getConsoleById(createdCon.id);
  assert(deletedCheck === null, "Temporary console station cleaned up and deleted");
  // Clean up temporary member using deleteMember service
  await deleteMember(newMember.id);
  console.log("  ✓ Temporary test member cleanly deleted with deleteMember service.\n");

  // -------------------------------------------------------------------
  // TEST GROUP 7: BOOKING & RESERVATION MANAGEMENT (28 TESTS)
  // -------------------------------------------------------------------
  console.log("▶ TEST GROUP 7: Booking & Reservation Management");

  // Create isolated test member for booking tests
  const bookingTestMember = await createMember({
    fullName: `Booking Tester ${Date.now().toString().slice(-4)}`,
  });
  assert(Boolean(bookingTestMember.id), `Isolated booking test member created: ${bookingTestMember.fullName}`);

  // Find test PC and test Console
  const freshPCs = await listPCs();
  const testPC = freshPCs.find((p) => p.status === PCStatus.AVAILABLE && p.stationNumber === "PC 04") ||
                 freshPCs.find((p) => p.status === PCStatus.AVAILABLE);
  assert(Boolean(testPC), `Found available PC for booking tests: ${testPC?.stationNumber}`);
  if (!testPC) return;

  const freshConsoles = await listConsoles();
  const testConsole = freshConsoles.find((c) => c.status === ConsoleStatus.AVAILABLE);
  assert(Boolean(testConsole), `Found available Console for booking tests: ${testConsole?.stationNumber}`);
  if (!testConsole) return;

  const testDate = "2026-11-20";

  // 1. Create PC booking
  const pcBooking = await createBooking({
    memberId: bookingTestMember.id,
    type: "PC",
    stationId: testPC.id,
    bookingDate: testDate,
    startTime: "10:00",
    durationHours: 2,
    status: BookingStatus.CONFIRMED,
    notes: "VIP PC Reservation Test",
  });
  assert(Boolean(pcBooking.id), `Test 1: PC booking created: ${pcBooking.bookingCode}`);
  assert(pcBooking.type === "PC", "Test 1b: Station type is PC");
  assert(pcBooking.startTime === "10:00" && pcBooking.endTime === "12:00", "Test 1c: Slot is 10:00 - 12:00");
  assert(pcBooking.durationHours === 2, "Test 1d: Duration is 2 hours");
  assert(pcBooking.totalPrice === testPC.hourlyRate * 2, "Test 1e: Authoritative price calculated");

  // 2. Create Console booking
  const conBooking = await createBooking({
    memberId: bookingTestMember.id,
    type: "CONSOLE",
    stationId: testConsole.id,
    bookingDate: testDate,
    startTime: "16:00",
    durationHours: 3,
    status: BookingStatus.CONFIRMED,
    notes: "PS5 Lounge Reservation Test",
  });
  assert(Boolean(conBooking.id), `Test 2: Console booking created: ${conBooking.bookingCode}`);
  assert(conBooking.type === "CONSOLE", "Test 2b: Station type is CONSOLE");
  assert(conBooking.durationHours === 3, "Test 2c: Duration is 3 hours");
  assert(conBooking.totalPrice === testConsole.hourlyRate * 3, "Test 2d: Console price calculated");

  // 3. Create member booking
  assert(pcBooking.memberId === bookingTestMember.id, "Test 3: Booking is linked to member ID");
  assert(pcBooking.member.fullName === bookingTestMember.fullName, "Test 3b: Member details included");

  // 4. Guest booking validation (schema requires registered member)
  let caughtGuestWithoutMember = false;
  try {
    await createBooking({
      memberId: "",
      type: "PC",
      stationId: testPC.id,
      bookingDate: testDate,
      startTime: "14:00",
      durationHours: 1,
    });
  } catch (err: unknown) {
    caughtGuestWithoutMember = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("Member"), `Test 4: Guest without member rejected: "${msg}"`);
  }
  assert(caughtGuestWithoutMember, "Test 4b: Booking without valid member was rejected");

  // 5. List bookings
  const bookedList = await listBookings({ date: testDate });
  assert(bookedList.length >= 2, `Test 5: listBookings returned ${bookedList.length} records`);
  assert(bookedList.some((b) => b.id === pcBooking.id), "Test 5b: pcBooking found in list");
  assert(bookedList.some((b) => b.id === conBooking.id), "Test 5c: conBooking found in list");

  // 6. Get booking by ID
  const fetchedPCBooking = await getBookingById(pcBooking.id);
  assert(fetchedPCBooking !== null && fetchedPCBooking.bookingCode === pcBooking.bookingCode, "Test 6: getBookingById returned record");
  assert(fetchedPCBooking?.stationNumber === testPC.stationNumber, "Test 6b: Station number matches");

  // 7. Reject invalid station
  let caughtInvalidStation = false;
  try {
    await createBooking({
      memberId: bookingTestMember.id,
      type: "PC",
      stationId: "invalid-station-id-999",
      bookingDate: testDate,
      startTime: "13:00",
      durationHours: 1,
    });
  } catch (err: unknown) {
    caughtInvalidStation = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("Station"), `Test 7: Invalid station rejected: "${msg}"`);
  }
  assert(caughtInvalidStation, "Test 7b: Booking with invalid station rejected");

  // 8. Reject invalid member
  let caughtInvalidBookingMember = false;
  try {
    await createBooking({
      memberId: "invalid-member-id-999",
      type: "PC",
      stationId: testPC.id,
      bookingDate: testDate,
      startTime: "13:00",
      durationHours: 1,
    });
  } catch (err: unknown) {
    caughtInvalidBookingMember = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("Member"), `Test 8: Invalid member rejected: "${msg}"`);
  }
  assert(caughtInvalidBookingMember, "Test 8b: Booking with invalid member rejected");

  // 9. Reject invalid date/time
  let caughtInvalidTime = false;
  try {
    await createBooking({
      memberId: bookingTestMember.id,
      type: "PC",
      stationId: testPC.id,
      bookingDate: testDate,
      startTime: "25:99",
      durationHours: 1,
    });
  } catch (err: unknown) {
    caughtInvalidTime = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("waktu") || msg.includes("format"), `Test 9: Invalid time rejected: "${msg}"`);
  }
  assert(caughtInvalidTime, "Test 9b: Booking with invalid time rejected");

  // 10. Reject zero/negative duration
  let caughtZeroDuration = false;
  try {
    await createBooking({
      memberId: bookingTestMember.id,
      type: "PC",
      stationId: testPC.id,
      bookingDate: testDate,
      startTime: "13:00",
      durationHours: 0,
    });
  } catch (err: unknown) {
    caughtZeroDuration = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("Durasi"), `Test 10: Zero duration rejected: "${msg}"`);
  }
  assert(caughtZeroDuration, "Test 10b: Booking with zero duration rejected");

  // 11. Reject overlapping booking
  // pcBooking is 10:00 - 12:00. Candidate 11:00 - 13:00 overlaps.
  let caughtOverlap = false;
  try {
    await createBooking({
      memberId: bookingTestMember.id,
      type: "PC",
      stationId: testPC.id,
      bookingDate: testDate,
      startTime: "11:00",
      durationHours: 2,
    });
  } catch (err: unknown) {
    caughtOverlap = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("bentrok"), `Test 11: Overlapping booking rejected: "${msg}"`);
  }
  assert(caughtOverlap, "Test 11b: Double booking was rejected by conflict engine");

  // 12. Allow booking immediately before another booking (08:00 - 10:00 before 10:00 - 12:00)
  const beforeBooking = await createBooking({
    memberId: bookingTestMember.id,
    type: "PC",
    stationId: testPC.id,
    bookingDate: testDate,
    startTime: "08:00",
    durationHours: 2,
  });
  assert(Boolean(beforeBooking.id), `Test 12: Adjacent before booking allowed: ${beforeBooking.bookingCode}`);

  // 13. Allow booking immediately after another booking (12:00 - 14:00 after 10:00 - 12:00)
  const afterBooking = await createBooking({
    memberId: bookingTestMember.id,
    type: "PC",
    stationId: testPC.id,
    bookingDate: testDate,
    startTime: "12:00",
    durationHours: 2,
  });
  assert(Boolean(afterBooking.id), `Test 13: Adjacent after booking allowed: ${afterBooking.bookingCode}`);

  // 14. Confirm booking
  const pendingBooking = await createBooking({
    memberId: bookingTestMember.id,
    type: "PC",
    stationId: testPC.id,
    bookingDate: testDate,
    startTime: "18:00",
    durationHours: 2,
    status: BookingStatus.PENDING,
  });
  assert(pendingBooking.status === BookingStatus.PENDING, "Test 14: Initial status is PENDING");
  const confirmedBooking = await confirmBooking(pendingBooking.id);
  assert(confirmedBooking.status === BookingStatus.CONFIRMED, "Test 14b: Booking confirmed to CONFIRMED");

  // 15. Reject confirmation when conflict exists
  const pendingConflict = await prisma.booking.create({
    data: {
      bookingCode: `BK-TST-PND-${Date.now().toString().slice(-4)}`,
      type: "PC",
      pcId: testPC.id,
      memberId: bookingTestMember.id,
      bookingDate: new Date(`${testDate}T00:00:00.000Z`),
      startTime: "14:00",
      endTime: "16:00",
      durationHours: 2,
      totalPrice: 20000,
      status: BookingStatus.PENDING,
    },
  });
  const confConflict = await prisma.booking.create({
    data: {
      bookingCode: `BK-TST-CNF-${Date.now().toString().slice(-4)}`,
      type: "PC",
      pcId: testPC.id,
      memberId: bookingTestMember.id,
      bookingDate: new Date(`${testDate}T00:00:00.000Z`),
      startTime: "15:00",
      endTime: "17:00",
      durationHours: 2,
      totalPrice: 20000,
      status: BookingStatus.CONFIRMED,
    },
  });
  let caughtConflictConfirm = false;
  try {
    await confirmBooking(pendingConflict.id);
  } catch (err: unknown) {
    caughtConflictConfirm = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("bentrok"), `Test 15: Conflicted confirmation rejected: "${msg}"`);
  }
  assert(caughtConflictConfirm, "Test 15b: Confirmation with conflict was rejected");
  await deleteBooking(pendingConflict.id);
  await deleteBooking(confConflict.id);

  // 16. Cancel booking
  const cancelledBooking = await cancelBooking(afterBooking.id, "Customer requested cancellation");
  assert(cancelledBooking.status === BookingStatus.CANCELLED, "Test 16: Booking status is CANCELLED");
  assert(Boolean(cancelledBooking.notes?.includes("Customer requested cancellation")), "Test 16b: Reason recorded");

  // 17. Reject duplicate cancellation
  let caughtDuplicateCancel = false;
  try {
    await cancelBooking(afterBooking.id);
  } catch (err: unknown) {
    caughtDuplicateCancel = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("sudah dibatalkan"), `Test 17: Duplicate cancellation rejected: "${msg}"`);
  }
  assert(caughtDuplicateCancel, "Test 17b: Duplicate cancel was properly rejected");

  // 19. Start booking session
  // Create a booking for testPC for starting session
  const todayStr = new Date().toISOString().slice(0, 10);
  const sessionBooking = await createBooking({
    memberId: bookingTestMember.id,
    type: "PC",
    stationId: testPC.id,
    bookingDate: todayStr,
    startTime: "21:00",
    durationHours: 1,
    status: BookingStatus.CONFIRMED,
  });

  const { booking: completedBooking, session: startedSession } = await startBookingSession(sessionBooking.id);
  assert(Boolean(startedSession.id), `Test 19: Session started from booking: ${startedSession.sessionNumber}`);
  assert(startedSession.status === SessionStatus.ACTIVE, "Test 19b: Started session is ACTIVE");

  // 20. Prevent duplicate active session
  let caughtDuplicateActiveSession = false;
  try {
    await startBookingSession(sessionBooking.id);
  } catch (err: unknown) {
    caughtDuplicateActiveSession = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("selesai") || msg.includes("IN_USE") || msg.includes("sesi aktif"), `Test 20: Duplicate session rejected: "${msg}"`);
  }
  assert(caughtDuplicateActiveSession, "Test 20b: Duplicate session start was properly prevented");

  // 21. Verify station becomes IN_USE when session starts
  const stationInUseCheck = await getPCById(testPC.id);
  assert(stationInUseCheck?.status === PCStatus.IN_USE, "Test 21: Station became IN_USE");

  // 22. Verify booking status changes correctly
  assert(completedBooking.status === BookingStatus.COMPLETED, "Test 22: Booking status is COMPLETED");

  // 18. Reject cancelling completed booking
  let caughtCancelCompleted = false;
  try {
    await cancelBooking(sessionBooking.id);
  } catch (err: unknown) {
    caughtCancelCompleted = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("selesai"), `Test 18: Cancelling completed booking rejected: "${msg}"`);
  }
  assert(caughtCancelCompleted, "Test 18b: Cancelling completed booking was rejected");

  // 23. Complete session and release station
  const stoppedBookingSession = await stopSession(startedSession.id);
  assert(stoppedBookingSession.status === SessionStatus.COMPLETED, "Test 23: Session stopped and COMPLETED");
  const stationReleasedCheck = await getPCById(testPC.id);
  assert(stationReleasedCheck?.status === PCStatus.AVAILABLE, "Test 23b: Station returned to AVAILABLE");

  // 24. Verify booking/session relationship remains correct
  const finalBookingCheck = await getBookingById(sessionBooking.id);
  assert(finalBookingCheck?.status === BookingStatus.COMPLETED, "Test 24: Booking remains COMPLETED");
  assert(Boolean(stoppedBookingSession.notes?.includes(sessionBooking.bookingCode)), "Test 24b: Session notes preserve booking code");

  // 25. Verify booking availability query
  const availabilityResult = await getBookingAvailability({
    date: testDate,
    startTime: "10:00",
    durationHours: 2,
  });
  const isTestPCAvailable = availabilityResult.pcs.some((p) => p.id === testPC.id);
  assert(!isTestPCAvailable, "Test 25: Station with 10:00-12:00 booking excluded from availability");

  // 26. Verify PC and Console availability separately
  const pcOnlyAvailability = await getBookingAvailability({
    date: testDate,
    startTime: "10:00",
    durationHours: 2,
    type: "PC",
  });
  assert(pcOnlyAvailability.pcs.length > 0 && pcOnlyAvailability.consoles.length === 0, "Test 26: type=PC returns only PCs");

  const conOnlyAvailability = await getBookingAvailability({
    date: testDate,
    startTime: "10:00",
    durationHours: 2,
    type: "CONSOLE",
  });
  assert(conOnlyAvailability.consoles.length > 0 && conOnlyAvailability.pcs.length === 0, "Test 26b: type=CONSOLE returns only Consoles");

  // 27. Verify maintenance/offline station is not offered when appropriate
  const maintStationPC = freshPCs.find((p) => p.status === PCStatus.MAINTENANCE);
  if (maintStationPC) {
    const maintCheckAvailability = await getBookingAvailability({
      date: testDate,
      startTime: "10:00",
      durationHours: 2,
      type: "PC",
    });
    const isMaintPCAvailable = maintCheckAvailability.pcs.some((p) => p.id === maintStationPC.id);
    assert(!isMaintPCAvailable, "Test 27: MAINTENANCE station not offered in availability");

    let caughtMaintBooking = false;
    try {
      await createBooking({
        memberId: bookingTestMember.id,
        type: "PC",
        stationId: maintStationPC.id,
        bookingDate: testDate,
        startTime: "10:00",
        durationHours: 2,
      });
    } catch (err: unknown) {
      caughtMaintBooking = true;
      const msg = err instanceof Error ? err.message : String(err);
      assert(msg.includes("MAINTENANCE"), `Test 27b: Booking MAINTENANCE station rejected: "${msg}"`);
    }
    assert(caughtMaintBooking, "Test 27c: Booking station in MAINTENANCE was rejected");
  }

  // 28. Clean up isolated test bookings and member
  await deleteBooking(pcBooking.id);
  await deleteBooking(conBooking.id);
  await deleteBooking(beforeBooking.id);
  await deleteBooking(afterBooking.id);
  await deleteBooking(pendingBooking.id);
  await deleteBooking(sessionBooking.id);
  await deleteMember(bookingTestMember.id);
  console.log("  ✓ Test 28: Isolated booking test fixtures cleaned up cleanly.\n");

  // -------------------------------------------------------------------
  // TEST GROUP 8: REPORTS & ANALYTICS (33 TESTS)
  // -------------------------------------------------------------------
  console.log("▶ TEST GROUP 8: Reports & Analytics");

  const reportTestDate = "2027-01-15";
  const { start: rStart, end: rEnd } = getJakartaDateBoundaries(reportTestDate);

  // Test 26 & 27: Empty date range handling and date boundary correctness
  const emptyRev = await getRevenueSummary(rStart, rEnd);
  assert(emptyRev.totalRevenue === 0, "Test 26: Empty date range returns totalRevenue = 0 (no NaN)");
  assert(emptyRev.totalTransactions === 0, "Test 26b: Empty date range returns totalTransactions = 0");
  assert(emptyRev.averageTransactionValue === 0, "Test 26c: Empty date range returns averageTransactionValue = 0 (no division by zero)");

  const emptyDaily = await getDailyRevenue(rStart, rEnd);
  assert(emptyDaily.length === 0, "Test 26d: Empty date range returns empty daily revenue array");

  const emptySess = await getSessionAnalytics(rStart, rEnd);
  assert(emptySess.totalSessions === 0, "Test 26e: Empty date range returns totalSessions = 0");
  assert(emptySess.averageDurationMinutes === 0, "Test 26f: Empty date range returns averageDurationMinutes = 0");

  // Date boundary correctness test with resolveDateRange
  const resolvedToday = resolveDateRange({ period: "today" });
  assert(Boolean(resolvedToday.startDate && resolvedToday.endDate), "Test 27: resolveDateRange resolves 'today'");
  assert(resolvedToday.startDate < resolvedToday.endDate, "Test 27b: startDate is before endDate");
  const resolvedWeek = resolveDateRange({ period: "this_week" });
  assert(resolvedWeek.startDate <= resolvedToday.startDate, "Test 27c: 'this_week' starts on or before today");

  // Setup isolated fixtures for 2027-01-15
  const reportMember = await createMember({
    fullName: `Report Tester ${Date.now().toString().slice(-4)}`,
  });

  // Ensure member createdAt is stamped to reportTestDate for testing new member filtering
  await prisma.member.update({
    where: { id: reportMember.id },
    data: { createdAt: new Date("2027-01-15T08:00:00+07:00") },
  });

  const availablePCForReport = (await listPCs()).find((p) => p.status === PCStatus.AVAILABLE) || testPC;
  const availableConsoleForReport = (await listConsoles()).find((c) => c.status === ConsoleStatus.AVAILABLE) || testConsole;

  // Create isolated Transactions on 2027-01-15:
  // 1. Paid STORE transaction: Rp15.000 with items
  const trxStorePaid = await prisma.transaction.create({
    data: {
      invoiceNumber: `INV-REP-STORE-${Date.now().toString().slice(-4)}`,
      memberId: reportMember.id,
      cashierName: "Admin",
      type: "STORE",
      subtotal: 15000,
      tax: 0,
      discount: 0,
      totalAmount: 15000,
      cashReceived: 20000,
      cashChange: 5000,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      createdAt: new Date("2027-01-15T09:30:00+07:00"),
      items: {
        create: [
          {
            description: "Ultra Energy Drink",
            unitPrice: 5000,
            quantity: 3,
            subtotal: 15000,
          },
        ],
      },
    },
  });

  // 2. Paid SESSION transaction: Rp30.000
  const trxSessionPaid = await prisma.transaction.create({
    data: {
      invoiceNumber: `INV-REP-SESS-${Date.now().toString().slice(-4)}`,
      memberId: reportMember.id,
      cashierName: "Admin",
      type: "SESSION",
      subtotal: 30000,
      tax: 0,
      discount: 0,
      totalAmount: 30000,
      cashReceived: 30000,
      cashChange: 0,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      createdAt: new Date("2027-01-15T14:00:00+07:00"),
    },
  });

  // 3. Paid MIXED transaction: Rp25.000 (Guest transaction)
  const trxMixedPaid = await prisma.transaction.create({
    data: {
      invoiceNumber: `INV-REP-MIXD-${Date.now().toString().slice(-4)}`,
      memberId: null, // Guest
      cashierName: "Admin",
      type: "MIXED",
      subtotal: 25000,
      tax: 0,
      discount: 0,
      totalAmount: 25000,
      cashReceived: 50000,
      cashChange: 25000,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      createdAt: new Date("2027-01-15T16:00:00+07:00"),
      items: {
        create: [
          {
            description: "Gaming Snack",
            unitPrice: 10000,
            quantity: 1,
            subtotal: 10000,
          },
        ],
      },
    },
  });

  // 4. UNPAID transaction: Rp999.999 (MUST BE EXCLUDED)
  const trxUnpaid = await prisma.transaction.create({
    data: {
      invoiceNumber: `INV-REP-UNPD-${Date.now().toString().slice(-4)}`,
      memberId: reportMember.id,
      cashierName: "Admin",
      type: "STORE",
      subtotal: 999999,
      tax: 0,
      discount: 0,
      totalAmount: 999999,
      cashReceived: 0,
      cashChange: 0,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
      createdAt: new Date("2027-01-15T11:00:00+07:00"),
    },
  });

  // 5. REFUNDED / CANCELLED transaction: Rp888.888 (MUST BE EXCLUDED)
  const trxRefunded = await prisma.transaction.create({
    data: {
      invoiceNumber: `INV-REP-RFND-${Date.now().toString().slice(-4)}`,
      memberId: reportMember.id,
      cashierName: "Admin",
      type: "STORE",
      subtotal: 888888,
      tax: 0,
      discount: 0,
      totalAmount: 888888,
      cashReceived: 888888,
      cashChange: 0,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.REFUNDED,
      createdAt: new Date("2027-01-15T12:00:00+07:00"),
    },
  });

  // Create isolated Sessions on 2027-01-15:
  // PC Session: 120 minutes, Rp20.000
  const sessionPCReport = await prisma.session.create({
    data: {
      sessionNumber: `SES-REP-PC-${Date.now().toString().slice(-4)}`,
      type: "PC",
      pcId: availablePCForReport.id,
      memberId: reportMember.id,
      startTime: new Date("2027-01-15T10:00:00+07:00"),
      endTime: new Date("2027-01-15T12:00:00+07:00"),
      durationMinutes: 120,
      remainingMinutes: 0,
      hourlyRate: 10000,
      totalPrice: 20000,
      status: SessionStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  // Console Session: 90 minutes, Rp30.000
  const sessionConsoleReport = await prisma.session.create({
    data: {
      sessionNumber: `SES-REP-CON-${Date.now().toString().slice(-4)}`,
      type: "CONSOLE",
      consoleId: availableConsoleForReport.id,
      memberId: reportMember.id,
      startTime: new Date("2027-01-15T14:00:00+07:00"),
      endTime: new Date("2027-01-15T15:30:00+07:00"),
      durationMinutes: 90,
      remainingMinutes: 0,
      hourlyRate: 20000,
      totalPrice: 30000,
      status: SessionStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  // Create isolated Bookings on 2027-01-15:
  const bookingConf = await prisma.booking.create({
    data: {
      bookingCode: `BK-REP-CNF-${Date.now().toString().slice(-4)}`,
      type: "PC",
      pcId: availablePCForReport.id,
      memberId: reportMember.id,
      bookingDate: new Date("2027-01-15T00:00:00.000Z"),
      startTime: "10:00",
      endTime: "12:00",
      durationHours: 2,
      totalPrice: 20000,
      status: BookingStatus.CONFIRMED,
    },
  });

  const bookingComp = await prisma.booking.create({
    data: {
      bookingCode: `BK-REP-CMP-${Date.now().toString().slice(-4)}`,
      type: "PC",
      pcId: availablePCForReport.id,
      memberId: reportMember.id,
      bookingDate: new Date("2027-01-15T00:00:00.000Z"),
      startTime: "13:00",
      endTime: "15:00",
      durationHours: 2,
      totalPrice: 20000,
      status: BookingStatus.COMPLETED,
    },
  });

  const bookingCanc = await prisma.booking.create({
    data: {
      bookingCode: `BK-REP-CNC-${Date.now().toString().slice(-4)}`,
      type: "PC",
      pcId: availablePCForReport.id,
      memberId: reportMember.id,
      bookingDate: new Date("2027-01-15T00:00:00.000Z"),
      startTime: "16:00",
      endTime: "17:00",
      durationHours: 1,
      totalPrice: 10000,
      status: BookingStatus.CANCELLED,
    },
  });

  // Create InventoryLog movement for testing
  const someProduct = await prisma.product.findFirst({ where: { isActive: true } });
  let repInvLog = null;
  if (someProduct) {
    repInvLog = await prisma.inventoryLog.create({
      data: {
        productId: someProduct.id,
        action: InventoryAction.STOCK_IN,
        quantity: 12,
        previousStock: someProduct.stock,
        newStock: someProduct.stock + 12,
        reason: "Report Verification Stock Test",
        createdAt: new Date("2027-01-15T11:00:00+07:00"),
      },
    });
  }

  // 1. Revenue Summary
  const repRev = await getRevenueSummary(rStart, rEnd);
  assert(repRev.totalRevenue === 70000, `Test 1: Revenue summary total is exactly Rp70.000 (${repRev.totalRevenue})`);

  // 2. Paid transaction included
  assert(repRev.totalRevenue >= 70000, "Test 2: All 3 paid transactions included in total revenue");

  // 3. Unpaid transaction excluded
  assert(!String(repRev.totalRevenue).includes("999999"), "Test 3: Unpaid PENDING transaction (Rp999.999) was excluded");

  // 4. Cancelled transaction excluded
  assert(!String(repRev.totalRevenue).includes("888888"), "Test 4: Cancelled/Refunded transaction (Rp888.888) was excluded");

  // 5. Store revenue
  assert(repRev.storeRevenue === 15000, `Test 5: Store revenue is exactly Rp15.000 (${repRev.storeRevenue})`);

  // 6. Session revenue
  assert(repRev.sessionRevenue === 30000, `Test 6: Session revenue is exactly Rp30.000 (${repRev.sessionRevenue})`);

  // 7. Mixed revenue
  assert(repRev.mixedRevenue === 25000, `Test 7: Mixed revenue is exactly Rp25.000 (${repRev.mixedRevenue})`);

  // 8. Transaction count
  assert(repRev.totalTransactions === 3, `Test 8: Total transactions count is exactly 3 (${repRev.totalTransactions})`);

  // 9. Average transaction value
  assert(repRev.averageTransactionValue === 23333, `Test 9: Average transaction value is round(70000/3) = 23333 (${repRev.averageTransactionValue})`);

  // 10. Daily revenue grouping
  const repDaily = await getDailyRevenue(rStart, rEnd);
  assert(repDaily.length === 1, `Test 10: Daily revenue grouped into 1 day (${repDaily.length})`);
  assert(repDaily[0].date === "2027-01-15", `Test 10b: Grouped date key is 2027-01-15 (${repDaily[0].date})`);
  assert(repDaily[0].revenue === 70000, `Test 10c: Daily total matches Rp70.000 (${repDaily[0].revenue})`);

  // 11. Session count
  const repSess = await getSessionAnalytics(rStart, rEnd);
  assert(repSess.totalSessions === 2, `Test 11: Total sessions count is 2 (${repSess.totalSessions})`);
  assert(repSess.completedSessions === 2, "Test 11b: Completed sessions count is 2");

  // 12. Session duration
  assert(repSess.totalPlayHours === 3.5, `Test 12: Total play hours is 3.5 hrs (${repSess.totalPlayHours})`);
  assert(repSess.averageDurationMinutes === 105, `Test 12b: Average session duration is 105 mins (${repSess.averageDurationMinutes})`);

  // 13. PC session analytics
  assert(repSess.pcSessionsCount === 1, "Test 13: PC session count is 1");
  assert(repSess.pcPlayHours === 2, "Test 13b: PC play hours is 2 hrs");
  assert(repSess.pcRevenue === 20000, "Test 13c: PC session revenue is Rp20.000");

  // 14. Console session analytics
  assert(repSess.consoleSessionsCount === 1, "Test 14: Console session count is 1");
  assert(repSess.consolePlayHours === 1.5, "Test 14b: Console play hours is 1.5 hrs");
  assert(repSess.consoleRevenue === 30000, "Test 14c: Console session revenue is Rp30.000");

  // 15. Booking count
  const repBook = await getBookingAnalytics(rStart, rEnd);
  assert(repBook.totalBookings === 3, `Test 15: Booking analytics total bookings is 3 (${repBook.totalBookings})`);

  // 16. Booking status breakdown
  assert(repBook.confirmedBookings === 1, "Test 16: Confirmed bookings is 1");
  assert(repBook.completedBookings === 1, "Test 16b: Completed bookings is 1");
  assert(repBook.cancelledBookings === 1, "Test 16c: Cancelled bookings is 1");
  assert(repBook.completionRate === 33, `Test 16d: Completion rate is round(1/3*100) = 33% (${repBook.completionRate}%)`);

  // 17. Member count
  const repMem = await getMemberAnalytics(rStart, rEnd);
  assert(repMem.totalMembers > 0, `Test 17: Total registered members is ${repMem.totalMembers}`);

  // 18. New member date filtering
  assert(repMem.newMembers >= 1, `Test 18: New members in date range is ${repMem.newMembers}`);
  assert(repMem.memberRevenue === 45000, `Test 18b: Member revenue (Rp15k + Rp30k) = Rp45.000 (${repMem.memberRevenue})`);
  assert(repMem.guestRevenue === 25000, `Test 18c: Guest revenue = Rp25.000 (${repMem.guestRevenue})`);

  // 19. Product units sold
  const repProd = await getProductAnalytics(rStart, rEnd);
  assert(repProd.totalUnitsSold === 4, `Test 19: Product units sold is 4 (${repProd.totalUnitsSold})`);

  // 20. Product revenue
  assert(repProd.storeRevenue === 25000, `Test 20: Product sales revenue is Rp25.000 (${repProd.storeRevenue})`);

  // 21. Top product ranking
  assert(repProd.topProducts.length >= 2, `Test 21: Top products returned ${repProd.topProducts.length} items`);
  assert(repProd.topProducts[0].productName === "Ultra Energy Drink", `Test 21b: Top product is Ultra Energy Drink (${repProd.topProducts[0].productName})`);
  assert(repProd.topProducts[0].unitsSold === 3, `Test 21c: Ultra Energy Drink units sold is 3 (${repProd.topProducts[0].unitsSold})`);

  // 22. Inventory movement counts
  const repInv = await getInventoryAnalytics(rStart, rEnd);
  assert(repInv.stockInCount >= 1, `Test 22: Inventory STOCK_IN count is ${repInv.stockInCount}`);
  assert(repInv.stockInUnits >= 12, `Test 22b: Inventory STOCK_IN units is ${repInv.stockInUnits}`);

  // 23. Low-stock report
  assert(typeof repInv.lowStockProducts === "number", `Test 23: Low stock products count is ${repInv.lowStockProducts}`);

  // 24. Out-of-stock report
  assert(typeof repInv.outOfStockProducts === "number", `Test 24: Out of stock products count is ${repInv.outOfStockProducts}`);
  assert(typeof repInv.totalValuation === "number" && repInv.totalValuation > 0, `Test 24b: Inventory valuation is Rp${repInv.totalValuation}`);

  // 25. Top station ranking
  const repStat = await getStationUtilization(rStart, rEnd);
  assert(repStat.totalSessions === 2, `Test 25: Station utilization reports 2 sessions (${repStat.totalSessions})`);
  assert(repStat.mostUsedPC === availablePCForReport.stationNumber, `Test 25b: Most used PC is ${repStat.mostUsedPC}`);
  assert(repStat.mostUsedConsole === availableConsoleForReport.stationNumber, `Test 25c: Most used Console is ${repStat.mostUsedConsole}`);

  // Comprehensive report aggregate endpoint test
  const fullReport = await getComprehensiveReports({
    period: "custom",
    startDate: "2027-01-15",
    endDate: "2027-01-15",
  });
  assert(fullReport.revenueSummary.totalRevenue === 70000, "Comprehensive report DTO aggregates correctly");
  assert(fullReport.recentTransactions.length === 3, "Recent transactions list in DTO contains 3 records");

  // Clean up isolated test fixtures
  await prisma.transactionItem.deleteMany({
    where: { transactionId: { in: [trxStorePaid.id, trxMixedPaid.id] } },
  });
  await prisma.transaction.deleteMany({
    where: { id: { in: [trxStorePaid.id, trxSessionPaid.id, trxMixedPaid.id, trxUnpaid.id, trxRefunded.id] } },
  });
  await prisma.session.deleteMany({
    where: { id: { in: [sessionPCReport.id, sessionConsoleReport.id] } },
  });
  await prisma.booking.deleteMany({
    where: { id: { in: [bookingConf.id, bookingComp.id, bookingCanc.id] } },
  });
  if (repInvLog) {
    await prisma.inventoryLog.delete({ where: { id: repInvLog.id } });
  }
  await deleteMember(reportMember.id);
  console.log("  ✓ Test 33: Isolated report test fixtures cleaned up cleanly.\n");

  console.log("▶ TEST GROUP 9: Gaming Profile & Game Library");

  // 1. Create game
  const testGameTitle = `Apex Legends AutoTest_${Date.now()}`;
  const testGame = await createGame({
    title: testGameTitle,
    genre: "Battle Royale",
    publisher: "Electronic Arts",
    minGpuRequired: "GTX 1660",
    popularityRank: 10,
    isInstalledOnPc: true,
    isInstalledConsole: false,
    tags: ["BR", "Hero Shooter", "Fast"],
  });
  assert(testGame.title === testGameTitle, `Test 1: createGame created ${testGame.title}`);
  assert(testGame.isInstalledOnPc === true, "Test 1b: isInstalledOnPc is true");
  assert(testGame.isActive === true, "Test 1c: isActive defaults to true");

  // 2. Get game
  const fetchedGame = await getGameById(testGame.id);
  assert(fetchedGame !== null && fetchedGame.id === testGame.id, "Test 2: getGameById returns game details");

  // 3. Search game
  const searchGamesResult = await listGames({ q: "Apex Legends" });
  assert(searchGamesResult.some((g) => g.id === testGame.id), "Test 3: search game finds created game");

  // 4. Filter game by platform
  const pcGames = await listGames({ platform: "PC" });
  assert(pcGames.some((g) => g.id === testGame.id), "Test 4: platform=PC filter includes test game");
  const consoleOnlyGames = await listGames({ platform: "CONSOLE" });
  assert(!consoleOnlyGames.some((g) => g.id === testGame.id), "Test 4b: platform=CONSOLE filter excludes PC-only game");

  // 5. Update game
  const updatedGame = await updateGame(testGame.id, { minGpuRequired: "RTX 3070" });
  assert(updatedGame.minGpuRequired === "RTX 3070", "Test 5: updateGame updated GPU requirement to RTX 3070");

  // 6. Deactivate and reactivate game
  const deactivatedGame = await updateGame(testGame.id, { isActive: false });
  assert(deactivatedGame.isActive === false, "Test 6: updateGame deactivated game (isActive=false)");
  const reactivatedGame = await updateGame(testGame.id, { isActive: true });
  assert(reactivatedGame.isActive === true, "Test 6b: reactivated game (isActive=true)");

  // 7. Progression formula verification (closed-form server rules)
  assert(calculateLevelFromXP(0) === 1, "Test 7: 0 XP is Level 1");
  assert(calculateLevelFromXP(99) === 1, "Test 7b: 99 XP is Level 1");
  assert(calculateLevelFromXP(100) === 2, "Test 7c: 100 XP is Level 2");
  assert(calculateLevelFromXP(249) === 2, "Test 7d: 249 XP is Level 2");
  assert(calculateLevelFromXP(250) === 3, "Test 7e: 250 XP is Level 3");
  assert(calculateLevelFromXP(450) === 4, "Test 7f: 450 XP is Level 4");
  assert(calculateLevelFromXP(700) === 5, "Test 7g: 700 XP is Level 5");
  assert(calculateXPForNextLevel(1) === 100, "Test 7h: XP for next level at L1 is 100");
  assert(calculateXPForNextLevel(2) === 250, "Test 7i: XP for next level at L2 is 250");
  assert(calculateXPForNextLevel(3) === 450, "Test 7j: XP for next level at L3 is 450");
  assert(calculateXPForNextLevel(4) === 700, "Test 7k: XP for next level at L4 is 700");

  // Session XP formula: 10 XP per completed 30 minutes
  assert(calculateSessionXP(25) === 0, "Test 7l: 25 mins yields 0 XP");
  assert(calculateSessionXP(30) === 10, "Test 7m: 30 mins yields 10 XP");
  assert(calculateSessionXP(59) === 10, "Test 7n: 59 mins yields 10 XP");
  assert(calculateSessionXP(60) === 20, "Test 7o: 60 mins yields 20 XP");
  assert(calculateSessionXP(90) === 30, "Test 7p: 90 mins yields 30 XP");
  assert(calculateSessionXP(120) === 40, "Test 7q: 120 mins yields 40 XP");

  // 8. Isolated test member setup
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const gamingMember = await createMember({
    fullName: `Gaming Tester ${randNum}`,
    username: `Gamer_${randNum}`,
    phoneNumber: `0877${randNum}1234`,
    email: `gamer_${randNum}@dreamtest.com`,
  });
  assert(gamingMember.id !== undefined, "Test 8: Isolated test member created");

  // 9. Initial Gaming Profile
  const initialProfile = await getGamingProfile(gamingMember.id);
  assert(initialProfile.member.id === gamingMember.id, "Test 9: getGamingProfile returns member details");
  assert(initialProfile.member.level === 1, "Test 9b: Initial level is 1");
  assert(initialProfile.member.xp === 0, "Test 9c: Initial XP is 0");
  assert(initialProfile.stats.totalSessions === 0, "Test 9d: Initial total sessions is 0");
  assert(initialProfile.stats.progressPercent === 0, "Test 9e: Progress percent is 0%");

  // 10. Nonexistent member rejected
  let nonExistentMemberRejected = false;
  try {
    await getGamingProfile("non-existent-member-cuid");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("tidak ditemukan")) {
      nonExistentMemberRejected = true;
    }
  }
  assert(nonExistentMemberRejected, "Test 10: Nonexistent member rejected with 404");

  // Find an available PC for gaming session tests
  const availableGamingPC = await prisma.pC.findFirst({
    where: { status: PCStatus.AVAILABLE },
  });
  if (!availableGamingPC) {
    throw new Error("No available PC station for gaming session tests");
  }

  // 11. Nonexistent game rejected when starting session
  let nonExistentGameRejected = false;
  try {
    await startSession({
      stationId: availableGamingPC.id,
      type: "PC",
      memberId: gamingMember.id,
      durationMinutes: 60,
      gameId: "invalid-game-cuid-999",
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Game tidak ditemukan")) {
      nonExistentGameRejected = true;
    }
  }
  assert(nonExistentGameRejected, "Test 11: Nonexistent gameId rejected when starting session");

  // 12. Start session with game
  const sessionWithGame = await startSession({
    stationId: availableGamingPC.id,
    type: "PC",
    memberId: gamingMember.id,
    durationMinutes: 60,
    gameId: testGame.id,
  });
  assert(sessionWithGame.id !== undefined, "Test 12: Session started with game");
  assert(sessionWithGame.gameId === testGame.id, "Test 12b: Session gameId is linked");
  assert(sessionWithGame.status === SessionStatus.ACTIVE, "Test 12c: Session status is ACTIVE");

  // 13. Complete session with game
  const stoppedSession = await stopSession(sessionWithGame.id);
  assert(stoppedSession.status === SessionStatus.COMPLETED, "Test 13: Session marked COMPLETED");

  // Verify session completion processor marked isXpAwarded
  const completedSessionRecord = await prisma.session.findUnique({
    where: { id: sessionWithGame.id },
  });
  assert(completedSessionRecord?.isXpAwarded === true, "Test 13b: isXpAwarded set to true on session");

  // 14. MemberGameStat created / updated
  const memberStatsAfter1 = await getMemberGameStats(gamingMember.id);
  assert(memberStatsAfter1.length === 1, "Test 14: MemberGameStat created for played game");
  const stat1 = memberStatsAfter1[0];
  assert(stat1.gameId === testGame.id, "Test 14b: Stat linked to correct gameId");
  assert(stat1.totalSessions === 1, `Test 14c: totalSessions is 1 (${stat1.totalSessions})`);
  assert(stat1.totalPlayMinutes === 60, `Test 14d: totalPlayMinutes is 60 (${stat1.totalPlayMinutes})`);
  assert(stat1.xp === 20, `Test 14e: Game XP is 20 (${stat1.xp})`);
  assert(stat1.lastPlayedAt !== null, "Test 14f: lastPlayedAt updated");

  // 15. Member XP awarded & level checked
  const memberAfter1 = await getMemberById(gamingMember.id);
  assert(memberAfter1 !== null && memberAfter1.xp === 20, `Test 15: Member received 20 XP (${memberAfter1?.xp})`);
  assert(memberAfter1 !== null && memberAfter1.dreamCoins === 102, `Test 15b: Member received 2 DreamCoins (Total: ${memberAfter1?.dreamCoins})`);
  assert(memberAfter1 !== null && memberAfter1.level === 1, "Test 15c: Member is still Level 1 (needs 100 XP for Lv 2)");

  // 16. Idempotency: duplicate completion does NOT award XP twice
  const dupAwardResult = await recordSessionCompletion(sessionWithGame.id);
  assert(dupAwardResult.awarded === false, "Test 16: Duplicate session completion returned awarded=false");
  const memberAfterDup = await getMemberById(gamingMember.id);
  assert(memberAfterDup !== null && memberAfterDup.xp === 20, `Test 16b: Member XP unchanged at 20 (${memberAfterDup?.xp})`);

  // 17. Second session with game (accumulation)
  const session2 = await startSession({
    stationId: availableGamingPC.id,
    type: "PC",
    memberId: gamingMember.id,
    durationMinutes: 60,
    gameId: testGame.id,
  });
  await stopSession(session2.id);

  const memberStatsAfter2 = await getMemberGameStats(gamingMember.id);
  const stat2 = memberStatsAfter2[0];
  assert(stat2.totalSessions === 2, `Test 17: totalSessions incremented to 2 (${stat2.totalSessions})`);
  assert(stat2.totalPlayMinutes === 120, `Test 17b: totalPlayMinutes incremented to 120 (${stat2.totalPlayMinutes})`);
  assert(stat2.xp === 40, `Test 17c: Game stat XP incremented to 40 (${stat2.xp})`);

  const memberAfter2 = await getMemberById(gamingMember.id);
  assert(memberAfter2 !== null && memberAfter2.xp === 40, `Test 17d: Member XP is now 40 (${memberAfter2?.xp})`);

  // 18. Session without game remains valid
  const sessionWithoutGame = await startSession({
    stationId: availableGamingPC.id,
    type: "PC",
    memberId: gamingMember.id,
    durationMinutes: 60,
    gameId: null,
  });
  await stopSession(sessionWithoutGame.id);

  const memberStatsAfterNoGame = await getMemberGameStats(gamingMember.id);
  assert(memberStatsAfterNoGame.length === 1, "Test 18: No ghost game stat created for session without game");
  const memberAfterNoGame = await getMemberById(gamingMember.id);
  assert(memberAfterNoGame !== null && memberAfterNoGame.xp === 60, `Test 18b: Member still earned 20 XP from session without game (${memberAfterNoGame?.xp})`);

  // 19. Level advancement check (Reach 100 XP -> Level 2)
  // Award 40 XP more (120 min session)
  const sessionLevelUp = await startSession({
    stationId: availableGamingPC.id,
    type: "PC",
    memberId: gamingMember.id,
    durationMinutes: 120,
    gameId: testGame.id,
  });
  await stopSession(sessionLevelUp.id);

  const memberAfterLevelUp = await getMemberById(gamingMember.id);
  assert(memberAfterLevelUp !== null && memberAfterLevelUp.xp === 100, `Test 19: Member reached 100 XP (${memberAfterLevelUp?.xp})`);
  assert(memberAfterLevelUp !== null && memberAfterLevelUp.level === 2, `Test 19b: Member advanced to Level 2! (${memberAfterLevelUp?.level})`);

  const profileAfterLevelUp = await getGamingProfile(gamingMember.id);
  assert(profileAfterLevelUp.member.level === 2, "Test 19c: Profile DTO reflects Level 2");
  assert(profileAfterLevelUp.stats.xpForCurrentLevel === 100, "Test 19d: Current level base XP is 100");
  assert(profileAfterLevelUp.stats.xpForNextLevel === 250, "Test 19e: Next level target XP is 250");
  assert(profileAfterLevelUp.stats.progressPercent === 0, "Test 19f: Progress percent at start of Level 2 is 0%");
  assert(profileAfterLevelUp.stats.xpRemaining === 150, "Test 19g: XP remaining for Level 3 is 150");

  // 20. Soft delete / deactivate game when sessions exist
  const deleteResult = await deleteGame(testGame.id);
  assert(deleteResult.deactivated === true, "Test 20: deleteGame soft-deactivates game because sessions exist");
  assert(deleteResult.deleted === false, "Test 20b: deleteGame preserved historical relations");
  const gameAfterDeactivate = await getGameById(testGame.id);
  assert(gameAfterDeactivate?.isActive === false, "Test 20c: Game isActive is false");

  // 21. Cleanup isolated test fixtures
  await prisma.session.deleteMany({
    where: {
      id: { in: [sessionWithGame.id, session2.id, sessionWithoutGame.id, sessionLevelUp.id] },
    },
  });
  await prisma.memberGameStat.deleteMany({
    where: { memberId: gamingMember.id },
  });
  await deleteMember(gamingMember.id);
  await prisma.game.delete({
    where: { id: testGame.id },
  });
  console.log("  ✓ Test 21: Isolated gaming profile test fixtures cleaned up cleanly.\n");

  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");
}

runTests()
  .catch((err) => {
    console.error("Test execution encountered an unhandled error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
