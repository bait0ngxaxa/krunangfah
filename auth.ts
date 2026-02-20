import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { ExtendedUser, UserRole } from "@/types/auth.types";

export const { handlers, auth, signIn, signOut } = NextAuth({
    pages: {
        signIn: "/signin",
        error: "/signin",
    },
    session: {
        strategy: "jwt",
        maxAge: 1 * 60 * 60, // 1 hour
    },
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials): Promise<ExtendedUser | null> {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                // Rate limiting is handled at client-side via server action
                // to provide better error messages

                try {
                    const user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (!user || !user.password) {
                        return null;
                    }

                    const isPasswordValid = await compare(
                        password,
                        user.password,
                    );

                    if (!isPasswordValid) {
                        return null;
                    }

                    // Sync role with whitelist on every login
                    const isWhitelisted =
                        await prisma.systemAdminWhitelist.findUnique({
                            where: { email, isActive: true },
                        });

                    if (isWhitelisted && user.role !== "system_admin") {
                        // Promote: whitelisted but not yet system_admin
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { role: "system_admin" },
                        });
                        user.role = "system_admin";
                    } else if (!isWhitelisted && user.role === "system_admin") {
                        // Demote: no longer whitelisted (removed or deactivated)
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { role: "school_admin" },
                        });
                        user.role = "school_admin";
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        role: user.role as UserRole,
                        isPrimary: user.isPrimary,
                        schoolId: user.schoolId,
                        emailVerified: user.emailVerified,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    };
                } catch (error) {
                    console.error(
                        "Authorization error:",
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                    );
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.isPrimary = user.isPrimary;
                token.schoolId = user.schoolId;
                token.lastActivity = Date.now();
            }

            // Re-sync role and schoolId from DB on session update
            if (trigger === "update" && token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { role: true, isPrimary: true, schoolId: true },
                });

                if (dbUser) {
                    token.role = dbUser.role as UserRole;
                    token.isPrimary = dbUser.isPrimary;
                    token.schoolId = dbUser.schoolId;
                }
            }

            // Check idle timeout (30 minutes)
            const IDLE_TIMEOUT = 30 * 60 * 1000;
            const lastActivity =
                (token.lastActivity as number | undefined) ?? Date.now();
            const isIdle = Date.now() - lastActivity > IDLE_TIMEOUT;

            if (isIdle) {
                return null;
            }

            token.lastActivity = Date.now();

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.isPrimary = (token.isPrimary as boolean) ?? false;
                session.user.schoolId =
                    (token.schoolId as string | null | undefined) ?? null;
            }
            return session;
        },
    },
});
