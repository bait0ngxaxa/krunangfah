"use client";

import type { ReactNode } from "react";
import { useState, useCallback } from "react";
import {
    CheckCircle2,
    GraduationCap,
    Loader2,
    Search,
    ShieldCheck,
    UserCog,
} from "lucide-react";
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
    const hasActiveFilters =
        selectedSchoolId !== "all" || searchQuery.trim().length > 0;

    // SWR for user data with automatic caching and deduping
    const { data, isValidating, mutate } = useSWR(
        ["users", selectedSchoolId, searchQuery, page],
        actionFetcher(() =>
            getUsers({
                schoolId:
                    selectedSchoolId === "all" ? undefined : selectedSchoolId,
                search: searchQuery || undefined,
                page,
            }),
        ),
        {
            ...searchSWRConfig,
            fallbackData: initialData,
            keepPreviousData: true,
        },
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
            <UserOnboardingPanel
                totalUsers={data?.total ?? initialData.total}
                visibleUsers={data?.users ?? initialData.users}
                hasSchools={schools.length > 0}
            />

            {/* School Filter */}
            {schools.length > 0 && (
                <SchoolFilter
                    schools={schools}
                    selectedSchoolId={selectedSchoolId}
                    onSchoolChange={handleSchoolChange}
                />
            )}

            {/* Search */}
            <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 border-gray-100 bg-white p-4 shadow-sm">
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-linear-to-br from-emerald-200/30 to-green-300/20 rounded-full blur-lg pointer-events-none" />
                <div className="relative p-2.5 bg-linear-to-br from-emerald-100 to-green-100 rounded-xl shadow-inner ring-1 ring-emerald-200/50 text-emerald-500">
                    {isValidating ? (
                        <Loader2
                            className="h-5 w-5 animate-spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <Search className="h-5 w-5" aria-hidden="true" />
                    )}
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาด้วยอีเมลหรือชื่อ..."
                    aria-label="ค้นหาผู้ใช้งานด้วยอีเมลหรือชื่อ"
                    aria-busy={isValidating}
                    className="relative min-w-0 flex-1 rounded-xl border border-emerald-100 bg-white px-4 py-2.5 font-medium text-gray-800 outline-none transition-base placeholder:text-gray-500 hover:border-emerald-300 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
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
                hasActiveFilters={hasActiveFilters}
            />
        </div>
    );
}

function UserOnboardingPanel({
    totalUsers,
    visibleUsers,
    hasSchools,
}: {
    totalUsers: number;
    visibleUsers: UserListResponse["users"];
    hasSchools: boolean;
}): ReactNode {
    const profileCount = visibleUsers.filter(
        (user) => user.hasTeacherProfile,
    ).length;
    const adminCount = visibleUsers.filter(
        (user) => user.role === "system_admin" || user.role === "school_admin",
    ).length;

    return (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-emerald-800">
                        <UserCog className="h-4 w-4" aria-hidden="true" />
                        <h2 className="text-sm font-bold">
                            อ่านสถานะผู้ใช้ก่อนจัดการบัญชี
                        </h2>
                    </div>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-950/75">
                        ใช้ตัวกรองโรงเรียนและช่องค้นหาเพื่อลดรายการ
                        จากนั้นดูบทบาท โปรไฟล์ครู และห้องที่ปรึกษาก่อนแก้ไขหรือลบผู้ใช้
                    </p>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">
                    ทั้งหมด {totalUsers} บัญชี
                </span>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
                <UserGuideStep
                    icon={<Search className="h-4 w-4" aria-hidden="true" />}
                    title="กรองและค้นหา"
                    description={
                        hasSchools
                            ? "เลือกโรงเรียนหรือพิมพ์อีเมล ชื่อครู เพื่อหาเป้าหมายให้เร็วขึ้น"
                            : "พิมพ์อีเมลหรือชื่อครูเพื่อหาเป้าหมายให้เร็วขึ้น"
                    }
                />
                <UserGuideStep
                    icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                    title="ดูบทบาท"
                    description={`ในผลลัพธ์นี้มีบัญชีผู้ดูแล ${adminCount} บัญชี`}
                />
                <UserGuideStep
                    icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
                    title="ตรวจโปรไฟล์ครู"
                    description={`มีโปรไฟล์ครูครบ ${profileCount} รายการในหน้าปัจจุบัน`}
                />
                <UserGuideStep
                    icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    title="แก้เฉพาะที่จำเป็น"
                    description="แก้ห้องที่ปรึกษาเมื่อข้อมูลผิด หรือลบบัญชีที่ไม่ควรเข้าใช้งาน"
                />
            </div>
        </section>
    );
}

function UserGuideStep({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}): ReactNode {
    return (
        <div className="rounded-xl border border-emerald-100 bg-white p-3 text-emerald-900">
            <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    {icon}
                </span>
                <span className="text-sm font-bold">{title}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-950/70">
                {description}
            </p>
        </div>
    );
}
