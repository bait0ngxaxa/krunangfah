import { Check } from "lucide-react";
import { STEPS } from "../constants";
import type { StepIndicatorProps } from "../types";

export function StepIndicator({ currentStep }: StepIndicatorProps) {
    return (
        <nav
            className="mb-8 overflow-x-auto"
            aria-label="ขั้นตอนการตั้งค่าเริ่มต้น"
        >
            <ol className="mx-auto flex min-w-max items-center justify-start gap-0 px-2 sm:justify-center">
                {STEPS.map(({ label, icon: Icon }, i) => (
                    <li
                        key={label}
                        className="flex items-center"
                        aria-current={i === currentStep ? "step" : undefined}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-base ${
                                    i < currentStep
                                        ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-sm"
                                        : i === currentStep
                                          ? "border-[var(--brand-primary)] text-[var(--brand-primary-hover)] bg-cyan-50"
                                          : "border-gray-200 text-gray-400 bg-white"
                                }`}
                            >
                                {i < currentStep ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Icon className="w-4 h-4" />
                                )}
                            </div>
                            <span
                                className={`max-w-24 whitespace-normal text-center text-[10px] font-medium leading-4 sm:max-w-none sm:whitespace-nowrap sm:text-xs ${i === currentStep ? "text-[var(--brand-primary-hover)]" : "text-gray-400"}`}
                            >
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                aria-hidden="true"
                                className={`mx-1 mb-4 h-0.5 w-8 transition-base sm:mx-2 sm:w-16 ${i < currentStep ? "bg-[var(--brand-primary)]" : "bg-gray-200"}`}
                            />
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
