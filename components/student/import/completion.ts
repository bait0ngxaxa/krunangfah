export interface ImportCompletionContext {
    academicYearId: string;
    academicYearLabel: string;
    assessmentRound: number;
    classNames: string[];
}

export function buildImportedStudentsHref(
    context: ImportCompletionContext,
): string {
    const searchParams = new URLSearchParams();
    const classNames = [
        ...new Set(
            context.classNames
                .map((className) => className.trim())
                .filter((className) => className.length > 0),
        ),
    ];

    if (classNames.length === 1) {
        searchParams.set("class", classNames[0]);
    }

    searchParams.set("year", context.academicYearId);
    searchParams.set("round", String(context.assessmentRound));

    return `/students?${searchParams.toString()}`;
}
