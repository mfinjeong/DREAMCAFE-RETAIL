/**
 * Utility for sanitizing redirect targets to prevent open redirects and redirect loops.
 */

const AUTH_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/sign-up",
];

export function sanitizeRedirectUrl(raw: string | null | undefined): string {
  if (!raw) return "/";

  const trimmed = raw.trim();
  if (!trimmed) return "/";

  // Must be absolute path within same origin
  if (!trimmed.startsWith("/")) return "/";

  // Disallow protocol-relative URLs (e.g. //evil.example)
  if (trimmed.startsWith("//")) return "/";

  // Disallow any scheme or authority tricks (e.g. javascript:, mailto:, data:, https:)
  if (trimmed.includes(":")) return "/";

  // Disallow backslashes which browsers or parsers might normalize to slashes
  if (trimmed.includes("\\")) return "/";

  // Disallow control characters or whitespace within path
  if (/[\x00-\x1F\x7F\s]/.test(trimmed)) return "/";

  // Prevent redirect loops back to auth pages
  const isAuthPath = AUTH_PATHS.some((authPath) => {
    return (
      trimmed === authPath ||
      trimmed.startsWith(`${authPath}?`) ||
      trimmed.startsWith(`${authPath}/`)
    );
  });

  if (isAuthPath) return "/";

  return trimmed;
}
