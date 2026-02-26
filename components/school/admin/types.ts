import type { SchoolAdminItem } from "@/types/primary-admin.types";

// Re-export for convenience
export type { SchoolAdminItem };

export interface PrimaryAdminManagerProps {
    initialAdmins: SchoolAdminItem[];
    currentUserId: string;
}

export interface UsePrimaryAdminReturn {
    admins: SchoolAdminItem[];
    loadingId: string | null;
    confirmId: string | null;
    handleToggle: (targetId: string) => Promise<void>;
    cancelConfirm: () => void;
}

export interface AdminListItemProps {
    admin: SchoolAdminItem;
    isCurrentUser: boolean;
    isLoading: boolean;
    isConfirming: boolean;
    onToggle: (targetId: string) => Promise<void>;
    onCancelConfirm: () => void;
}
