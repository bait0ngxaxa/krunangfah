"use client";

import { useState, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import useSWR from "swr";
import { SchoolFilter } from "@/components/analytics/filters/SchoolFilter";
import { UserTable } from "./UserTable";
import { getUsers } from "@/lib/actions/user-management.actions";
import { actionFetcher, searchSWRConfig } from "@/lib/swr/config";
import type { UserListResponse } from "@/types/user-management.types";

interface UserManagementProps {
    initialData: UserListResponse;
    schools: { id: string; name: string }[];
}

export function UserManagement({ initialData, schools }: UserManagementProps) {
    const [selectedSchoolId, setSelectedSchoolId] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);

    // SWR for user data with automatic caching and deduping
    const { data, isValidating, mutate } = useSWR(
        ["users", selectedSchoolId, searchQuery, page],
        actionFetcher(() =>
            getUsers({
                schoolId: selectedSchoolId === "all" ? undefined : selectedSchoolId,
                search: searchQuery || undefined,
                page,
            })
        ),
        {
            ...searchSWRConfig,
            fallbackData: initialData,
            keepPreviousData: true,
        }
    );

    const handleSchoolChange = useCallback((schoolId: string) => {
        setSelectedSchoolId(schoolId);
        setPage(1); // Reset to first page when filter changes
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const handleMutated = useCallback(() => {
        void mutate(); // Revalidate current data
    }, [mutate]);

    return (
        <div className="space-y-4">
            {/* School Filter */}
            {schools.length > 0 && (
                <SchoolFilter
                    schools={schools}
                    selectedSchoolId={selectedSchoolId}
                    onSchoolChange={handleSchoolChange}
                />
            )}

            {/* Search */}
            <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(16,185,129,0.15)] border border-emerald-200 ring-1 ring-white/80 p-4 flex items-center gap-3 overflow-hidden">
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-linear-to-br from-emerald-200/30 to-green-300/20 rounded-full blur-lg pointer-events-none" />
                <div className="relative p-2.5 bg-linear-to-br from-emerald-100 to-green-100 rounded-xl shadow-inner ring-1 ring-emerald-200/50 text-emerald-500">
                    {isValidating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Search className="w-5 h-5" />
                    )}
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาด้วย email หรือชื่อ..."
                    className="relative flex-1 min-w-0 px-4 py-2.5 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all outline-none bg-white/70 backdrop-blur-sm hover:border-emerald-300 text-gray-600 font-medium placeholder:text-gray-400"
                />
            </div>

            {/* User Table */}
            <UserTable
                users={data?.users ?? []}
                total={data?.total ?? 0}
                page={data?.page ?? 1}
                pageSize={data?.pageSize ?? 10}
                onPageChange={handlePageChange}
                onMutated={handleMutated}
            />
        </div>
    );
}
