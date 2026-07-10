export interface SchoolInfo {
    id: string;
    name: string;
    province: string | null;
}

export interface SchoolInfoActionResponse {
    success: boolean;
    message: string;
    data?: SchoolInfo;
}
