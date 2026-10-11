/**
 * Secret Manager Interface & Utilities for Rental Account Credentials
 *
 * Security Requirements:
 * - Credentials (passwords/tokens) must NEVER be stored in plaintext.
 * - Credentials must NEVER be returned in API responses, logged, or sent to analytics.
 * - `secretRef` is a uniform resource identifier for an external secret manager
 *   (e.g., "vault://dreamcafe/steam/cs2-01" or "aws-sm://dreamcafe/rental/cs2-01").
 * - When no external secret manager provider is configured, the system MUST fail closed
 *   and NOT pretend that credentials are resolved.
 */

import { z } from "zod";

export interface SecretManagerProvider {
  name: string;
  isAvailable(): boolean;
  isConfigured(): boolean;
  resolveSecret(secretRef: string): Promise<string | null>;
  validateSecretRef(secretRef: string): boolean;
}

/**
 * Valid URI patterns for external secret references.
 * Must specify scheme (e.g., vault, aws-sm, gcp-sm, env-vault) and a valid path.
 */
const SECRET_REF_REGEX = /^[a-z0-9_-]+:\/\/[a-zA-Z0-9_./-]+$/;

export function isValidSecretRefFormat(secretRef: string): boolean {
  if (!secretRef || typeof secretRef !== "string") return false;
  const trimmed = secretRef.trim();
  if (trimmed.length < 5 || trimmed.length > 255) return false;
  return SECRET_REF_REGEX.test(trimmed);
}

/**
 * Placeholder / Null Provider when no external Secret Manager is configured.
 * Fails closed safely: never exposes mock secrets or credentials.
 */
export class UnconfiguredSecretManagerProvider implements SecretManagerProvider {
  name = "unconfigured";

  isAvailable(): boolean {
    return false;
  }

  isConfigured(): boolean {
    return false;
  }

  async resolveSecret(_secretRef: string): Promise<string | null> {
    // Fail closed: Secret manager is not integrated in production yet.
    // NEVER return mock or default passwords.
    return null;
  }

  validateSecretRef(secretRef: string): boolean {
    return isValidSecretRefFormat(secretRef);
  }
}

let activeProvider: SecretManagerProvider = new UnconfiguredSecretManagerProvider();

export function setSecretManagerProvider(provider: SecretManagerProvider): void {
  activeProvider = provider;
}

export function getSecretManagerProvider(): SecretManagerProvider {
  return activeProvider;
}

export function getConfiguredSecretProvider(): SecretManagerProvider {
  return activeProvider;
}

/**
 * Redacts any credential or secretRef from objects before logging or returning to clients.
 */
export function sanitizeRentalAccountForClient<T extends Record<string, unknown>>(account: T): Omit<T, "secretRef" | "password"> {
  const sanitized = { ...account };
  delete (sanitized as Record<string, unknown>).secretRef;
  delete (sanitized as Record<string, unknown>).password;
  return sanitized;
}
