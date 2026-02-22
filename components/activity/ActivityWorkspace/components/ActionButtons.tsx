"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Download, ChevronDown, FileText } from "lucide-react";
import { getWorksheetNames } from "../constants";

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

    const handleDownload = (url: string) => {
        window.open(url, "_blank");
        setIsDropdownOpen(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Link
                href={`/students/${studentId}/help/guidelines${phqResultId ? `?phqResultId=${phqResultId}` : ""}`}
                className={`group flex items-center justify-center gap-3 py-4 px-6 bg-[#34D399] text-white rounded-xl font-bold hover:shadow-md hover:bg-emerald-400 hover:-translate-y-0.5 transition-all shadow-sm`}
            >
                <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-lg">หลักการใช้ใบงาน</span>
            </Link>

            {/* Download Button with Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#0BD0D9] text-white rounded-xl font-bold hover:shadow-md hover:bg-[#09B8C0] hover:-translate-y-0.5 transition-all shadow-sm group"
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
                    <div className="absolute top-full mt-3 left-0 right-0 bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                        {downloadUrls.map((url, index) => {
                            const worksheetNames =
                                getWorksheetNames(activityNumber);
                            const worksheetName = worksheetNames.at(index);

                            return (
                                <button
                                    key={url}
                                    onClick={() => handleDownload(url)}
                                    className="w-full px-6 py-4 text-left hover:bg-emerald-50 transition-colors flex items-center gap-4 border-b last:border-b-0 border-emerald-50/50 group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FileText className="w-5 h-5 text-emerald-600" />
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
                                    <div className="text-gray-300 group-hover:text-emerald-500 transition-colors">
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
