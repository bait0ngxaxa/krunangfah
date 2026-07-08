import type { UserRole } from "./auth.types";

export interface UserListItem {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    isPrimary: boolean;
    schoolId: string | null;
    schoolName: string | null;
    hasTeacherProfile: boolean;
    teacherName: string | null;
    advisoryClass: string | null;
    createdAt: Date;
}

export interface GetUsersOptions {
    schoolId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface UserListResponse {
    users: UserListItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface MutationResponse {
    success: boolean;
    message: string;
}

export type StaffRoleSelection =
    | "primary_school_admin"
    | "angel_teacher"
    | "class_teacher";

export type ChangeableRole = StaffRoleSelection | "school_admin";
