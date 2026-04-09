"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface QueryPaginationProps {
    page: number;
    totalPages: number;
    pageParam: string;
}

export function QueryPagination({
    page,
    totalPages,
    pageParam,
}: QueryPaginationProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    if (totalPages <= 1) {
        return null;
    }

    const goToPage = (nextPage: number): void => {
        if (nextPage < 1 || nextPage > totalPages || nextPage === page) {
            return;
        }

        const params = new URLSearchParams(searchParams.toString());
        if (nextPage === 1) {
            params.delete(pageParam);
        } else {
            params.set(pageParam, nextPage.toString());
        }

        const query = params.toString();
        router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, {
            scroll: false,
        });
    };

    return (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-sm font-medium text-gray-600">
                หน้า {page} จาก {totalPages}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                >
                    ก่อนหน้า
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                >
                    ถัดไป
                </Button>
            </div>
        </div>
    );
}
