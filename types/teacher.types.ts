import type { UserRole } from "./auth.types";

// บทบาทหน้าที่ในโครงการครูนางฟ้า
export type ProjectRole = "lead" | "care" | "coordinate";

// Academic Year
export interface AcademicYear {
    id: string;
    year: number;
    semester: number;
    startDate: Date;
    endDate: Date;
    isCurrent: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface School {
    id: string;
    name: string;
    province: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface TeacherProfile {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    age: number;
    advisoryClass: string;
    academicYearId: string;
    schoolRole: string;
    projectRole: string; // Changed from ProjectRole to string to match Prisma
    createdAt: Date;
    updatedAt: Date;
    academicYear?: AcademicYear;
    school?: School;
}

export interface CreateTeacherInput {
    firstName: string;
    lastName: string;
    age: number;
    advisoryClass: string;
    academicYearId: string;
    schoolRole: string;
    projectRole: ProjectRole;
}

export interface TeacherResponse {
    success: boolean;
    message: string;
    teacher?: TeacherProfile;
    newRole?: UserRole;
}
