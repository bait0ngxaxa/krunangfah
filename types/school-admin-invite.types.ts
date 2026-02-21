export type InviteRole = "system_admin" | "school_admin";

export interface SchoolAdminInvite {
    id: string;
    token: string;
    email: string;
    role: InviteRole;
    usedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
    creator: { name: string | null; email: string };
}

export type InviteStatus = "pending" | "used" | "expired";

export interface InviteActionResponse {
    success: boolean;
    message: string;
    data?: { inviteUrl: string };
}
