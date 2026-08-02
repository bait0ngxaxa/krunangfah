/**
 * Return the canonical representation used for email identity comparisons.
 */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}
