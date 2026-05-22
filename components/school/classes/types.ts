import type { SchoolClassItem } from "@/types/school-setup.types";

// Re-export for convenience
export type { SchoolClassItem };

export interface ClassListEditorProps {
    initialClasses: SchoolClassItem[];
    academicYears?: AcademicYearOption[];
    lockAcademicYearSelection?: boolean;
    onUpdate?: (classes: SchoolClassItem[]) => void;
    readOnly?: boolean;
}

export interface AcademicYearOption {
    id: string;
    year: number;
    semester: number;
    isCurrent: boolean;
}

export interface UseClassListReturn {
    classes: SchoolClassItem[];
    inputValue: string;
    studentCountValue: string;
    errorMsg: string | null;
    bulkGrade: string;
    bulkCount: string;
    bulkStudentCount: string;
    setInputValue: (value: string) => void;
    setStudentCountValue: (value: string) => void;
    setBulkGrade: (value: string) => void;
    setBulkCount: (value: string) => void;
    setBulkStudentCount: (value: string) => void;
    handleAdd: () => Promise<void>;
    handleRemove: (id: string, name: string) => Promise<void>;
    handleUpdateStudentCount: (
        id: string,
        name: string,
        expectedStudentCount: number,
    ) => Promise<void>;
    handleBulkAdd: () => Promise<void>;
}

export interface SingleClassAdderProps {
    inputValue: string;
    studentCountValue: string;
    onInputChange: (value: string) => void;
    onStudentCountChange: (value: string) => void;
    onAdd: () => Promise<void>;
}

export interface BulkClassAdderProps {
    bulkGrade: string;
    bulkCount: string;
    bulkStudentCount: string;
    onGradeChange: (value: string) => void;
    onCountChange: (value: string) => void;
    onStudentCountChange: (value: string) => void;
    onBulkAdd: () => Promise<void>;
}

export interface ClassGroupListProps {
    classes: SchoolClassItem[];
    readOnly: boolean;
    onRemove: (id: string, name: string) => void;
    onStudentCountChange: (
        id: string,
        name: string,
        expectedStudentCount: number,
    ) => Promise<void>;
}
