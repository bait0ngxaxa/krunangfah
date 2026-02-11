export interface WhitelistEntry {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
}

export interface WhitelistActionResponse {
    success: boolean;
    message: string;
    data?: WhitelistEntry;
}
