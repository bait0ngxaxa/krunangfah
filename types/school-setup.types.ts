import type { UserRole, ProjectRole } from "@prisma/client";

export interface SchoolClassItem {
    id: string;
    name: string;
}

export interface TeacherOption {
    id: string; // Teacher.id
    userId: string;
    name: string; // firstName + lastName
    advisoryClass: string;
}

export interface SchoolContextData {
    classes: SchoolClassItem[];
    teachers: TeacherOption[];
}

export interface SchoolSetupResponse {
    success: boolean;
    message: string;
    data?: { schoolId: string };
}

export interface ClassActionResponse {
    success: boolean;
    message: string;
    data?: SchoolClassItem;
}

export interface TeacherRosterItem {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    age: number;
    userRole: UserRole;
    advisoryClass: string;
    schoolRole: string;
    projectRole: ProjectRole;
    inviteSent: boolean;
}

export interface RosterActionResponse {
    success: boolean;
    message: string;
    data?: TeacherRosterItem;
}
