export const INPUT_LIMITS = {
    school: {
        name: 200,
        province: 100,
        className: 50,
    },
    teacher: {
        firstName: 100,
        lastName: 100,
        advisoryClass: 50,
        schoolRole: 200,
    },
    counseling: {
        counselorName: 100,
        summary: 5000,
    },
    homeVisit: {
        description: 5000,
    },
    activity: {
        internalProblems: 3000,
        externalProblems: 3000,
        teacherNotes: 2000,
    },
    hospitalReferral: {
        hospitalName: 200,
    },
} as const;
