import type { RateLimitErrorPayload } from "@/types/rate-limit.types";

// Teacher invite related type definitions

export interface TeacherInvite {
    id: string;
    token: string;
    email: string;
    firstName: string;
    lastName: string;
    age: number;
    userRole: string;
    advisoryClass: string;
    schoolId: string;
    schoolRole: string;
    projectRole: string;
    invitedById: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
}

// Type for invite with relations (used when fetching with include)
export interface TeacherInviteWithRelations extends TeacherInvite {
    school: { name: string };
}

export interface InviteResponse {
    success: boolean;
    message: string;
    error?: RateLimitErrorPayload;
    invite?: TeacherInviteWithRelations;
    inviteLink?: string;
}

// Type for invite in list queries (no academicYear needed)
export type TeacherInviteWithAcademicYear = TeacherInvite;

export interface InviteListResponse {
    success: boolean;
    invites: TeacherInviteWithAcademicYear[];
}
