/**
 * Format currency to Indonesian Rupiah (e.g., Rp43.000, Rp10.000)
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s+/g, ""); // "Rp 43.000" -> "Rp43.000" as in prompt
}

/**
 * Format seconds or minutes into HH:MM:SS countdown format (e.g., "00:44:48")
 */
export function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return "00:00:00";
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format ISO date string into Indonesian friendly format
 */
export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(date);
  } catch {
    return isoString;
  }
}
