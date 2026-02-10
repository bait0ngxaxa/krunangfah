/**
 * User management - สร้าง/ค้นหา/จัดการข้อมูลผู้ใช้
 *
 * ฟังก์ชันที่เกี่ยวกับ User record ใน database
 * สำหรับ session/auth ให้ใช้ @/lib/session แทน
 */

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type {
    ExtendedUser,
    SignUpCredentials,
    AuthResponse,
} from "@/types/auth.types";

/**
 * Hash password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    return await hash(password, 12);
}

/**
 * Create a new user (Basic registration with email + password only)
 * School and teacher profile will be created later via TeacherProfileForm
 * @param credentials - User credentials (email + password)
 * @returns Authentication response
 */
export async function createUser(
    credentials: SignUpCredentials,
): Promise<AuthResponse> {
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: credentials.email },
        });

        if (existingUser) {
            return {
                success: false,
                message: "อีเมลนี้ถูกใช้งานแล้ว",
            };
        }

        // Hash password
        const hashedPassword = await hashPassword(credentials.password);

        // Check if email is in system_admin whitelist
        const isWhitelisted = await prisma.systemAdminWhitelist.findUnique({
            where: { email: credentials.email, isActive: true },
        });

        // Create user with basic info only (no name, no school yet)
        // Name and school will be set when creating Teacher profile
        const user = await prisma.user.create({
            data: {
                email: credentials.email,
                password: hashedPassword,
                role: isWhitelisted ? "system_admin" : "school_admin",
            },
        });

        return {
            success: true,
            message: "User created successfully. Please complete your profile.",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role as ExtendedUser["role"],
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        };
    } catch (error) {
        console.error("Create user error:", error);
        return {
            success: false,
            message: "Failed to create user",
        };
    }
}

/**
 * Get user by ID
 * @param userId - User ID
 * @returns User object or null
 */
export async function getUserById(
    userId: string,
): Promise<ExtendedUser | null> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role as ExtendedUser["role"],
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    } catch (error) {
        console.error("Get user by ID error:", error);
        return null;
    }
}
