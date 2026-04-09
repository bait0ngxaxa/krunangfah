"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Download, ChevronDown, FileText } from "lucide-react";
import { getWorksheetNames } from "../constants";
import { studentHelpGuidelinesRoute } from "@/lib/constants/student-routes";

interface ActionButtonsProps {
    studentId: string;
    config: { gradient: string };
    activityNumber: number;
    downloadUrls: string[];
    phqResultId?: string;
}

/**
 * Action buttons for guidelines and download
 */
export function ActionButtons({
    studentId,

    activityNumber,
    downloadUrls,
    phqResultId,
}: ActionButtonsProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

    const handleDownload = (url: string): void => {
        const fileName = url.split("/").pop() ?? "worksheet.pdf";
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setIsDropdownOpen(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Link
                href={studentHelpGuidelinesRoute(studentId, phqResultId)}
                className="group flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-6 py-4 font-bold text-white shadow-md transition-base hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-lg"
            >
                <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-lg">หลักการใช้ใบงาน</span>
            </Link>

            {/* Download Button with Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-6 py-4 font-bold text-white shadow-md transition-base hover:-translate-y-0.5 hover:bg-cyan-600 hover:shadow-lg"
                >
                    <Download className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-lg">ดาวน์โหลดใบงาน</span>
                    <ChevronDown
                        className={`w-5 h-5 transition-transform duration-300 ${
                            isDropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur-sm">
                        {downloadUrls.map((url, index) => {
                            const worksheetNames =
                                getWorksheetNames(activityNumber);
                            const worksheetName = worksheetNames.at(index);

                            return (
                                <button
                                    key={url}
                                    onClick={() => handleDownload(url)}
                                    className="group flex w-full items-center gap-4 border-b border-gray-100 px-6 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm transition-transform group-hover:scale-105">
                                        <FileText className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div className="flex-1">
                                        {downloadUrls.length > 1 ? (
                                            <>
                                                <div className="font-bold text-gray-800">
                                                    ใบงานที่ {index + 1}
                                                </div>
                                                <div className="text-sm text-gray-500 font-medium group-hover:text-emerald-600 transition-colors">
                                                    {worksheetName}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">
                                                {worksheetName ||
                                                    "ดาวน์โหลดใบงาน"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-gray-300 transition-colors group-hover:text-cyan-500">
                                        <Download className="w-5 h-5" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
