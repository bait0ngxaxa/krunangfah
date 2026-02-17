/**
 * Type definitions for User Profile Settings
 */

import type { ProjectRole } from "./teacher.types";

/**
 * User profile data returned from getCurrentUserProfile
 */
export interface UserProfileData {
    userId: string;
    email: string | null;
    name: string | null;
    teacher: {
        firstName: string;
        lastName: string;
        age: number;
        advisoryClass: string;
        academicYearId: string;
        schoolRole: string;
        projectRole: ProjectRole;
    };
    school: {
        id: string;
        name: string;
    } | null;
}

/**
 * Input for updating teacher profile
 * Note: schoolName is excluded to prevent school changes
 */
export interface ProfileUpdateInput {
    firstName: string;
    lastName: string;
    age: number;
    advisoryClass: string;
    academicYearId: string;
    schoolRole: string;
    projectRole: ProjectRole;
}

/**
 * Response from profile update operation
 */
export interface ProfileUpdateResponse {
    success: boolean;
    message: string;
    profile?: UserProfileData;
}

/**
 * Input for changing password
 */
export interface PasswordChangeInput {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

/**
 * Response from password change operation
 */
export interface PasswordChangeResponse {
    success: boolean;
    message: string;
}
