"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import { SchoolFilter } from "@/components/analytics/filters/SchoolFilter";
import { UserTable } from "./UserTable";
import { getUsers } from "@/lib/actions/user-management.actions";
import type { UserListResponse } from "@/types/user-management.types";

interface UserManagementProps {
    initialData: UserListResponse;
    schools: { id: string; name: string }[];
}

export function UserManagement({ initialData, schools }: UserManagementProps) {
    const [data, setData] = useState(initialData);
    const [selectedSchoolId, setSelectedSchoolId] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isPending, startTransition] = useTransition();

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchUsers = useCallback(
        (page: number, schoolId: string, search: string) => {
            startTransition(async () => {
                const result = await getUsers({
                    schoolId: schoolId === "all" ? undefined : schoolId,
                    search: search || undefined,
                    page,
                });
                setData(result);
            });
        },
        [],
    );

    // Refetch when filters change
    useEffect(() => {
        fetchUsers(1, selectedSchoolId, debouncedSearch);
    }, [selectedSchoolId, debouncedSearch, fetchUsers]);

    function handleSchoolChange(schoolId: string) {
        setSelectedSchoolId(schoolId);
    }

    function handlePageChange(page: number) {
        fetchUsers(page, selectedSchoolId, debouncedSearch);
    }

    function handleMutated() {
        fetchUsers(data.page, selectedSchoolId, debouncedSearch);
    }

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
                    {isPending ? (
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
                users={data.users}
                total={data.total}
                page={data.page}
                pageSize={data.pageSize}
                onPageChange={handlePageChange}
                onMutated={handleMutated}
            />
        </div>
    );
}
