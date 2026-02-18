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

                    // system_admin doesn't need a teacher profile
                    const isSystemAdmin = user.role === "system_admin";

                    const teacherProfile = isSystemAdmin
                        ? null
                        : await prisma.teacher.findUnique({
                              where: { userId: user.id },
                              select: { id: true },
                          });

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        role: user.role as UserRole,
                        hasTeacherProfile: isSystemAdmin || !!teacherProfile,
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
                token.hasTeacherProfile = user.hasTeacherProfile;
                token.lastActivity = Date.now();
            }

            // Re-check hasTeacherProfile on session update
            if (trigger === "update" && token.id) {
                const teacherProfile = await prisma.teacher.findUnique({
                    where: { userId: token.id as string },
                    select: { id: true },
                });
                token.hasTeacherProfile = !!teacherProfile;
            }

            // Check idle timeout (30 minutes = 1800000ms)
            const IDLE_TIMEOUT = 30 * 60 * 1000;
            const lastActivity = (token.lastActivity as number) || Date.now();
            const isIdle = Date.now() - lastActivity > IDLE_TIMEOUT;

            if (isIdle) {
                // Session expired due to inactivity
                return null;
            }

            // Update last activity on each request
            token.lastActivity = Date.now();

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.hasTeacherProfile =
                    token.hasTeacherProfile as boolean;
            }
            return session;
        },
    },
});
