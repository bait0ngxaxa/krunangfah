import { prisma } from "@/lib/database/prisma";
import {
    auditLegacyActivityProgress,
    cleanupLegacyActivityProgress,
} from "@/lib/services/legacy-round-two-activity-cleanup";

const CLEANUP_FLAG = "--cleanup";
const HELP_FLAG = "--help";

interface CliOptions {
    cleanup: boolean;
    help: boolean;
}

function parseArgs(args: readonly string[]): CliOptions {
    const unknownArgs = args.filter(
        (arg) => arg !== CLEANUP_FLAG && arg !== HELP_FLAG,
    );
    if (unknownArgs.length > 0 || args.filter((arg) => arg === CLEANUP_FLAG).length > 1) {
        throw new Error(`Unknown or repeated argument: ${unknownArgs[0] ?? CLEANUP_FLAG}`);
    }

    return {
        cleanup: args.includes(CLEANUP_FLAG),
        help: args.includes(HELP_FLAG),
    };
}

function printUsage(): void {
    console.info(
        [
            "Usage:",
            "  npm run audit:legacy-round-two-activities",
            "  npm run audit:legacy-round-two-activities -- --cleanup",
            "",
            "The default mode is a non-destructive dry-run. --cleanup is an explicit",
            "operator opt-in and deletes only rows that pass the transactional predicate.",
        ].join("\n"),
    );
}

async function run(): Promise<void> {
    try {
        const options = parseArgs(process.argv.slice(2));
        if (options.help) {
            printUsage();
            return;
        }

        const report = options.cleanup
            ? await cleanupLegacyActivityProgress()
            : await auditLegacyActivityProgress();

        console.info(
            JSON.stringify(
                {
                    mode: options.cleanup ? "cleanup" : "dry-run",
                    ...report,
                },
                null,
                2,
            ),
        );
    } finally {
        await prisma.$disconnect();
    }
}

void run().catch((error: unknown) => {
    console.error("Legacy Round 2 activity audit failed:", error);
    process.exitCode = 1;
});
