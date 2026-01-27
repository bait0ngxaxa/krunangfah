/**
 * Server Actions for Authentication
 * Server-side functions for user registration
 */

"use server";

import { createUser } from "@/lib/auth";
import type { SignUpCredentials, AuthResponse } from "@/types/auth.types";

/**
 * Register a new user
 * @param credentials - User registration credentials
 * @returns Authentication response
 */
export async function registerUser(
    credentials: SignUpCredentials,
): Promise<AuthResponse> {
    return await createUser(credentials);
}
