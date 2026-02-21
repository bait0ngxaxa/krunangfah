/**
 * User roles in the system
 */
export type UserRole =
    | "school_admin"
    | "system_admin"
    | "class_teacher";

/**
 * Extended User interface
 */
export interface ExtendedUser {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    role: UserRole;
    isPrimary?: boolean;
    schoolId?: string | null;
    emailVerified?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Extended Session interface
 */
declare module "next-auth" {
    interface Session {
        user: ExtendedUser;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends ExtendedUser {}
}

/**
 * Sign in credentials
 */
export interface SignInCredentials {
    email: string;
    password: string;
}

/**
 * Sign up credentials - Basic registration (email + password only)
 * Additional profile info (name, school, etc.) will be collected later
 */
export type SignUpCredentials = SignInCredentials;

/**
 * Authentication response
 */
export interface AuthResponse {
    success: boolean;
    message: string;
    user?: ExtendedUser;
    redirectTo?: string;
}

/**
 * Authentication error
 */
export interface AuthError {
    code: string;
    message: string;
}
