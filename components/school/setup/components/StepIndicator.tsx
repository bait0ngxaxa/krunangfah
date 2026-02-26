import { Check } from "lucide-react";
import { STEPS } from "../constants";
import type { StepIndicatorProps } from "../types";

export function StepIndicator({ currentStep }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map(({ label, icon: Icon }, i) => (
                <div key={label} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                                i < currentStep
                                    ? "bg-[#0BD0D9] border-[#0BD0D9] text-white shadow-sm"
                                    : i === currentStep
                                      ? "border-[#0BD0D9] text-[#09B8C0] bg-cyan-50"
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
                            className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${i === currentStep ? "text-[#09B8C0]" : "text-gray-400"}`}
                        >
                            {label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div
                            className={`w-8 sm:w-16 h-0.5 mb-4 mx-1 sm:mx-2 transition-all ${i < currentStep ? "bg-[#0BD0D9]" : "bg-gray-200"}`}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
