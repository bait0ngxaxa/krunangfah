import type { SchoolClassItem } from "@/types/school-setup.types";

// Re-export for convenience
export type { SchoolClassItem };

export interface ClassListEditorProps {
    initialClasses: SchoolClassItem[];
    onUpdate?: (classes: SchoolClassItem[]) => void;
    readOnly?: boolean;
}

export interface UseClassListReturn {
    classes: SchoolClassItem[];
    inputValue: string;
    errorMsg: string | null;
    bulkGrade: string;
    bulkCount: string;
    setInputValue: (value: string) => void;
    setBulkGrade: (value: string) => void;
    setBulkCount: (value: string) => void;
    handleAdd: () => Promise<void>;
    handleRemove: (id: string, name: string) => Promise<void>;
    handleBulkAdd: () => Promise<void>;
}

export interface SingleClassAdderProps {
    inputValue: string;
    onInputChange: (value: string) => void;
    onAdd: () => Promise<void>;
}

export interface BulkClassAdderProps {
    bulkGrade: string;
    bulkCount: string;
    onGradeChange: (value: string) => void;
    onCountChange: (value: string) => void;
    onBulkAdd: () => Promise<void>;
}

export interface ClassGroupListProps {
    classes: SchoolClassItem[];
    readOnly: boolean;
    onRemove: (id: string, name: string) => void;
}
