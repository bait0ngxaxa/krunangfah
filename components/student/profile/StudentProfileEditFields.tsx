import {
    BadgeCheck,
    Cake,
    CreditCard,
    Hash,
    type LucideIcon,
    UserRound,
    UsersRound,
    VenusAndMars,
} from "lucide-react";
import { STUDENT_STATUS_OPTIONS } from "@/lib/constants/student-status";

const GENDER_OPTIONS = [
    { value: "", label: "ไม่ระบุ" },
    { value: "MALE", label: "ชาย" },
    { value: "FEMALE", label: "หญิง" },
] as const;

const INPUT_CLASS =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const ICON_CLASS =
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700";

export interface StudentProfileFormState {
    studentId: string;
    nationalId: string;
    firstName: string;
    lastName: string;
    gender: string;
    age: string;
    class: string;
    status: string;
}

export interface SelectOption {
    value: string;
    label: string;
}

export type UpdateField = (
    field: keyof StudentProfileFormState,
    value: string,
) => void;

function FieldLabel({
    Icon,
    htmlFor,
    label,
}: {
    Icon: LucideIcon;
    htmlFor: string;
    label: string;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className="flex items-center gap-2 text-sm font-bold text-slate-700"
        >
            <span className={ICON_CLASS}>
                <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            {label}
        </label>
    );
}

interface TextFieldProps {
    Icon: LucideIcon;
    id: string;
    label: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
    inputMode?: "numeric";
    max?: number;
    maxLength?: number;
    min?: number;
    placeholder?: string;
    required?: boolean;
    type?: "number" | "text";
}

function TextField({ Icon, id, label, onChange, ...props }: TextFieldProps) {
    return (
        <div className="min-w-0 space-y-1.5">
            <FieldLabel Icon={Icon} htmlFor={id} label={label} />
            <input
                id={id}
                className={INPUT_CLASS}
                onChange={(event) => onChange(event.target.value)}
                {...props}
            />
        </div>
    );
}

interface SelectFieldProps {
    Icon: LucideIcon;
    id: string;
    label: string;
    value: string;
    disabled: boolean;
    options: readonly SelectOption[];
    onChange: (value: string) => void;
    required?: boolean;
}

function SelectField({
    Icon,
    id,
    label,
    onChange,
    options,
    ...props
}: SelectFieldProps) {
    return (
        <div className="min-w-0 space-y-1.5">
            <FieldLabel Icon={Icon} htmlFor={id} label={label} />
            <select
                id={id}
                className={INPUT_CLASS}
                onChange={(event) => onChange(event.target.value)}
                {...props}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

interface FormControlsProps {
    form: StudentProfileFormState;
    isProfileLocked: boolean;
    isPending: boolean;
    updateField: UpdateField;
}

function PersonalFieldControls({
    form,
    isProfileLocked,
    isPending,
    updateField,
}: FormControlsProps) {
    const isDisabled = isPending || isProfileLocked;

    return (
        <>
            <TextField
                Icon={UserRound}
                id="student-first-name"
                label="ชื่อ"
                value={form.firstName}
                onChange={(value) => updateField("firstName", value)}
                maxLength={100}
                required
                disabled={isDisabled}
            />
            <TextField
                Icon={UsersRound}
                id="student-last-name"
                label="นามสกุล"
                value={form.lastName}
                onChange={(value) => updateField("lastName", value)}
                maxLength={100}
                required
                disabled={isDisabled}
            />
            <SelectField
                Icon={VenusAndMars}
                id="student-gender"
                label="เพศ"
                value={form.gender}
                options={GENDER_OPTIONS}
                onChange={(value) => updateField("gender", value)}
                disabled={isDisabled}
            />
            <TextField
                Icon={Cake}
                id="student-age"
                label="อายุ"
                value={form.age}
                onChange={(value) => updateField("age", value)}
                type="number"
                min={1}
                max={100}
                disabled={isDisabled}
            />
        </>
    );
}

function SchoolFieldControls({
    form,
    isProfileLocked,
    isPending,
    updateField,
}: FormControlsProps) {
    const isSchoolInfoDisabled = isPending || isProfileLocked;

    return (
        <>
            <TextField
                Icon={Hash}
                id="student-id"
                label="รหัสนักเรียน"
                value={form.studentId}
                onChange={(value) => updateField("studentId", value)}
                maxLength={50}
                required
                disabled={isSchoolInfoDisabled}
            />
            <TextField
                Icon={CreditCard}
                id="student-national-id"
                label="เลขบัตรประชาชน"
                value={form.nationalId}
                onChange={(value) =>
                    updateField(
                        "nationalId",
                        value.replace(/\D/g, "").slice(0, 13),
                    )
                }
                inputMode="numeric"
                maxLength={13}
                placeholder="ตัวเลข 13 หลัก"
                disabled={isSchoolInfoDisabled}
            />
            <SelectField
                Icon={BadgeCheck}
                id="student-status"
                label="สถานะ"
                value={form.status}
                options={STUDENT_STATUS_OPTIONS}
                onChange={(value) => updateField("status", value)}
                disabled={isPending}
            />
        </>
    );
}

export function StudentProfileFields(props: FormControlsProps) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
                <span className={ICON_CLASS}>
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                    แก้ไขข้อมูลนักเรียน
                </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <PersonalFieldControls {...props} />
                <SchoolFieldControls {...props} />
            </div>
        </section>
    );
}
