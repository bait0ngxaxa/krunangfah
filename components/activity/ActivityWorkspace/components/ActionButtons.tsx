"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Download, ChevronDown } from "lucide-react";
import { WORKSHEET_NAMES } from "../constants";

interface ActionButtonsProps {
    studentId: string;
    config: { gradient: string };
    activityNumber: number;
    downloadUrls: string[];
}

/**
 * Action buttons for guidelines and download
 */
export function ActionButtons({
    studentId,
    config,
    activityNumber,
    downloadUrls,
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link
                href={`/students/${studentId}/help/guidelines`}
                className={`flex items-center justify-center gap-3 py-4 px-6 bg-linear-to-r ${config.gradient} text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md`}
            >
                <BookOpen className="w-5 h-5" />
                หลักการใช้ใบงาน
            </Link>

            {/* Download Button with Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-linear-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md"
                >
                    <Download className="w-5 h-5" />
                    ดาวน์โหลดใบงาน
                    <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                            isDropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-10">
                        {downloadUrls.map((url, index) => {
                            const worksheetNames =
                                WORKSHEET_NAMES[activityNumber] || [];
                            const worksheetName = worksheetNames[index];

                            return (
                                <button
                                    key={url}
                                    onClick={() => handleDownload(url)}
                                    className="w-full px-6 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 border-b last:border-b-0 border-gray-100"
                                >
                                    <span className="text-xl">📄</span>
                                    <div className="flex-1">
                                        {downloadUrls.length > 1 ? (
                                            <>
                                                <div className="font-medium text-gray-700">
                                                    ใบงานที่ {index + 1}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {worksheetName}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="font-medium text-gray-700">
                                                {worksheetName ||
                                                    "ดาวน์โหลดใบงาน"}
                                            </div>
                                        )}
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
