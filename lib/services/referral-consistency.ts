export class ReferralConsistencyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ReferralConsistencyError";
    }
}
