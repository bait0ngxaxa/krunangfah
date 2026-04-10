interface PhqResultIdentifier {
    id: string;
}

export function getLatestPhqResult<T extends PhqResultIdentifier>(
    phqResults: readonly T[],
): T | null {
    return phqResults[0] ?? null;
}

export function getRequestedOrLatestPhqResult<T extends PhqResultIdentifier>(
    phqResults: readonly T[],
    phqResultId?: string,
): T | null {
    if (!phqResultId) {
        return getLatestPhqResult(phqResults);
    }

    return (
        phqResults.find((phqResult) => phqResult.id === phqResultId) ??
        getLatestPhqResult(phqResults)
    );
}

export function isActionableLatestPhqResultId<T extends PhqResultIdentifier>(
    phqResults: readonly T[],
    phqResultId: string,
): boolean {
    const latestPhqResult = getLatestPhqResult(phqResults);
    return latestPhqResult?.id === phqResultId;
}
