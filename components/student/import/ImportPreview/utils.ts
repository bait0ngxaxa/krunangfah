import { calculateRiskLevel, type PhqScores } from "@/lib/utils/phq-scoring";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type { ImportResult } from "@/lib/actions/student/types";
import type {
    AcademicYear,
    PreviewStudent,
    RiskCounts,
    TeacherProfile,
    ZeroScoreWarningInfo,
} from "./types";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

export function formatImportIssues(result: ImportResult): string {
    if (!result.errors || result.errors.length === 0) {
        return result.message;
    }

    return `${result.message}\n\n${result.errors.join("\n")}`;
}

export function formatParseImportErrors(errors: string[]): string | null {
    if (errors.length === 0) {
        return null;
    }

    return `มีบางแถวที่ยังไม่พร้อมนำเข้า\n\n${errors.join("\n")}`;
}

export function createPreviewStudents(
    data: ParsedStudent[],
): PreviewStudent[] {
    return data.map((student, index) => {
        const { totalScore, riskLevel } = calculateRiskLevel(student.scores);
        return { ...student, totalScore, riskLevel, _originalIndex: index };
    });
}

export function filterPreviewStudents({
    students,
    schoolClassNames,
    teacherProfile,
}: {
    students: PreviewStudent[];
    schoolClassNames: string[];
    teacherProfile: TeacherProfile | null;
}): {
    previewData: PreviewStudent[];
    filteredOutStudents: PreviewStudent[];
    riskCounts: RiskCounts;
} {
    const isClassTeacher =
        teacherProfile?.role === "class_teacher" &&
        !!teacherProfile.advisoryClass;
    const normalizedAdvisoryClass = teacherProfile?.advisoryClass
        ? normalizeClassName(teacherProfile.advisoryClass)
        : undefined;
    const validClassSet = new Set(
        schoolClassNames.map((className) => normalizeClassName(className)),
    );
    const previewData: PreviewStudent[] = [];
    const filteredOutStudents: PreviewStudent[] = [];
    const riskCounts = createEmptyRiskCounts();

    for (const student of students) {
        const studentClass = normalizeClassName(student.class);
        const classExists =
            validClassSet.size > 0 && validClassSet.has(studentClass);
        const outsideAdvisoryClass =
            isClassTeacher && studentClass !== normalizedAdvisoryClass;

        if (!classExists || outsideAdvisoryClass) {
            filteredOutStudents.push(student);
            continue;
        }

        previewData.push(student);
        riskCounts[student.riskLevel]++;
    }

    return { previewData, filteredOutStudents, riskCounts };
}

export function buildZeroScoreWarning(
    students: PreviewStudent[],
): ZeroScoreWarningInfo | null {
    const examples: ZeroScoreWarningInfo["examples"] = [];
    let studentCount = 0;

    for (const student of students) {
        if (!hasAllZeroQuestionScores(student.scores)) continue;

        studentCount++;
        if (examples.length < 5) {
            examples.push({
                studentId: student.studentId,
                fullName: `${student.firstName} ${student.lastName}`,
                class: student.class,
            });
        }
    }

    return studentCount > 0 ? { studentCount, examples } : null;
}

export function getImportedClasses(students: PreviewStudent[]): string[] {
    return [...new Set(students.map((student) => student.class))];
}

export function buildImportStudentsPayload(
    students: PreviewStudent[],
): ParsedStudent[] {
    return students.map((student) => ({
        studentId: student.studentId,
        nationalId: student.nationalId,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        age: student.age,
        class: student.class,
        scores: student.scores,
    }));
}

export function getAcademicYearLabel(
    academicYears: AcademicYear[],
    selectedYearId: string,
): string {
    const year = academicYears.find(
        (academicYear) => academicYear.id === selectedYearId,
    );
    return year ? `${year.year} เทอม ${year.semester}` : "";
}

function createEmptyRiskCounts(): RiskCounts {
    return {
        blue: 0,
        green: 0,
        yellow: 0,
        orange: 0,
        red: 0,
    };
}

function hasAllZeroQuestionScores(scores: PhqScores): boolean {
    return (
        scores.q1 === 0 &&
        scores.q2 === 0 &&
        scores.q3 === 0 &&
        scores.q4 === 0 &&
        scores.q5 === 0 &&
        scores.q6 === 0 &&
        scores.q7 === 0 &&
        scores.q8 === 0 &&
        scores.q9 === 0
    );
}
