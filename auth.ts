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

                    // Check if user has a teacher profile
                    const teacherProfile = await prisma.teacher.findUnique({
                        where: { userId: user.id },
                        select: { id: true },
                    });

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        role: user.role as UserRole,
                        hasTeacherProfile: !!teacherProfile,
                        emailVerified: user.emailVerified,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    };
                } catch (error) {
                    console.error("Authorization error:", error);
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
            }

            // Re-check hasTeacherProfile on session update
            if (trigger === "update" && token.id) {
                const teacherProfile = await prisma.teacher.findUnique({
                    where: { userId: token.id as string },
                    select: { id: true },
                });
                token.hasTeacherProfile = !!teacherProfile;
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.hasTeacherProfile = token.hasTeacherProfile as boolean;
            }
            return session;
        },
    },
});
