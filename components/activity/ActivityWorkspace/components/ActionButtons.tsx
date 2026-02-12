"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Download, ChevronDown, FileText } from "lucide-react";
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Link
                href={`/students/${studentId}/help/guidelines`}
                className={`group flex items-center justify-center gap-3 py-4 px-6 bg-linear-to-r ${config.gradient} text-white rounded-xl font-bold hover:shadow-lg hover:shadow-pink-200 hover:-translate-y-0.5 transition-all shadow-md`}
            >
                <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-lg">หลักการใช้ใบงาน</span>
            </Link>

            {/* Download Button with Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-linear-to-r from-blue-500 via-cyan-500 to-teal-400 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-cyan-200 hover:-translate-y-0.5 transition-all shadow-md group"
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
                    <div className="absolute top-full mt-3 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-100 overflow-hidden z-50 animate-fade-in-up">
                        {downloadUrls.map((url, index) => {
                            const worksheetNames =
                                WORKSHEET_NAMES[activityNumber] || [];
                            const worksheetName = worksheetNames[index];

                            return (
                                <button
                                    key={url}
                                    onClick={() => handleDownload(url)}
                                    className="w-full px-6 py-4 text-left hover:bg-pink-50 transition-colors flex items-center gap-4 border-b last:border-b-0 border-pink-50/50 group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FileText className="w-5 h-5 text-pink-600" />
                                    </div>
                                    <div className="flex-1">
                                        {downloadUrls.length > 1 ? (
                                            <>
                                                <div className="font-bold text-gray-800">
                                                    ใบงานที่ {index + 1}
                                                </div>
                                                <div className="text-sm text-gray-500 font-medium group-hover:text-pink-600 transition-colors">
                                                    {worksheetName}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="font-bold text-gray-800 group-hover:text-pink-600 transition-colors">
                                                {worksheetName ||
                                                    "ดาวน์โหลดใบงาน"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-gray-300 group-hover:text-pink-500 transition-colors">
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
