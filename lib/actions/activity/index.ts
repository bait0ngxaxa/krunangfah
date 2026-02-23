// Activity actions - Re-exports for backward compatibility

export { getActivityProgress } from "./queries";

export {
    initializeActivityProgress,
    submitTeacherAssessment,
    unlockNextActivity,
    scheduleActivity,
    updateTeacherNotes,
    confirmActivityComplete,
} from "./mutations";

export { uploadWorksheet, deleteWorksheetUpload } from "./file-utils";

export { ACTIVITY_INDICES, REQUIRED_WORKSHEETS } from "./constants";

export type {
    ActivityProgressData,
    UploadWorksheetResult,
    SubmitAssessmentData,
    ScheduleActivityData,
} from "./types";
