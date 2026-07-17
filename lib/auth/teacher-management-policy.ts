import type { UserRole } from "@/types/auth.types";

export interface TeacherManagementActor {
    role: UserRole;
    isPrimary?: boolean;
}

export interface TeacherManagementCapabilities {
    canViewTeacherManagement: boolean;
    canViewTeacherRoster: boolean;
    canManageTeacherRoster: boolean;
    canViewTeacherInvites: boolean;
    canCreateTeacherInvite: boolean;
    canRevokeTeacherInvite: boolean;
    canManageSchoolClasses: boolean;
}

function isSchoolAdmin(actor: TeacherManagementActor): boolean {
    return actor.role === "school_admin";
}

function isPrimarySchoolAdmin(actor: TeacherManagementActor): boolean {
    return isSchoolAdmin(actor) && actor.isPrimary === true;
}

export function canViewTeacherManagement(
    actor: TeacherManagementActor,
): boolean {
    return isSchoolAdmin(actor);
}

export function canViewTeacherRoster(actor: TeacherManagementActor): boolean {
    return isSchoolAdmin(actor);
}

export function canManageTeacherRoster(
    actor: TeacherManagementActor,
): boolean {
    return isPrimarySchoolAdmin(actor);
}

export function canViewTeacherInvites(actor: TeacherManagementActor): boolean {
    return isSchoolAdmin(actor);
}

export function canCreateTeacherInvite(
    actor: TeacherManagementActor,
): boolean {
    return isSchoolAdmin(actor);
}

export function canRevokeTeacherInvite(
    actor: TeacherManagementActor,
): boolean {
    return actor.role === "system_admin" || isPrimarySchoolAdmin(actor);
}

export function canManageSchoolClasses(
    actor: TeacherManagementActor,
): boolean {
    return isPrimarySchoolAdmin(actor);
}

export function getTeacherManagementCapabilities(
    actor: TeacherManagementActor,
): TeacherManagementCapabilities {
    return {
        canViewTeacherManagement: canViewTeacherManagement(actor),
        canViewTeacherRoster: canViewTeacherRoster(actor),
        canManageTeacherRoster: canManageTeacherRoster(actor),
        canViewTeacherInvites: canViewTeacherInvites(actor),
        canCreateTeacherInvite: canCreateTeacherInvite(actor),
        canRevokeTeacherInvite: canRevokeTeacherInvite(actor),
        canManageSchoolClasses: canManageSchoolClasses(actor),
    };
}
