// Student-related type definitions

export interface ImportResult {
    success: boolean;
    message: string;
    imported?: number;
    errors?: string[];
}
