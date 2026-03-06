import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const sendMail = vi.fn();
    const createTransport = vi.fn(() => ({ sendMail }));
    return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
    default: {
        createTransport: mocks.createTransport,
    },
    createTransport: mocks.createTransport,
}));

describe("lib/email", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();

        process.env = { ...originalEnv };
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_PORT;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;
        delete process.env.SMTP_FROM;
        delete process.env.NEXT_PUBLIC_APP_URL;
    });

    it("throws when SMTP config is missing", async () => {
        process.env.SMTP_USER = "smtp-user";
        process.env.SMTP_PASS = "smtp-pass";

        const { sendPasswordResetEmail } = await import("@/lib/email");

        await expect(
            sendPasswordResetEmail("user@test.local", "token-1"),
        ).rejects.toThrow(/Missing SMTP configuration/);

        expect(mocks.createTransport).not.toHaveBeenCalled();
    });

    it("creates transporter and sends password reset email", async () => {
        process.env.SMTP_HOST = "smtp.test.local";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_USER = "smtp-user";
        process.env.SMTP_PASS = "smtp-pass";
        process.env.SMTP_FROM = "No Reply <no-reply@test.local>";
        process.env.NEXT_PUBLIC_APP_URL = "https://app.test.local";

        mocks.sendMail.mockResolvedValue({} as never);

        const { sendPasswordResetEmail } = await import("@/lib/email");

        await sendPasswordResetEmail("user@test.local", "token-123");

        expect(mocks.createTransport).toHaveBeenCalledWith({
            host: "smtp.test.local",
            port: 587,
            secure: false,
            auth: {
                user: "smtp-user",
                pass: "smtp-pass",
            },
        });

        expect(mocks.sendMail).toHaveBeenCalledTimes(1);
        const mail = mocks.sendMail.mock.calls[0][0] as {
            from: string;
            to: string;
            html: string;
            attachments: Array<{ path: string; cid: string }>;
        };

        expect(mail.from).toBe("No Reply <no-reply@test.local>");
        expect(mail.to).toBe("user@test.local");
        expect(mail.html).toContain(
            "https://app.test.local/reset-password?token=token-123",
        );
        expect(mail.attachments[0].cid).toBe("logo");
        expect(mail.attachments[0].path).toMatch(
            /public[\\/]image[\\/]homepage[\\/]icon 1\.png$/,
        );
    });

    it("uses secure transport when SMTP_PORT is 465", async () => {
        process.env.SMTP_HOST = "smtp.test.local";
        process.env.SMTP_PORT = "465";
        process.env.SMTP_USER = "smtp-user";
        process.env.SMTP_PASS = "smtp-pass";

        mocks.sendMail.mockResolvedValue({} as never);

        const { sendPasswordResetEmail } = await import("@/lib/email");

        await sendPasswordResetEmail("user@test.local", "token-2");

        expect(mocks.createTransport).toHaveBeenCalledWith(
            expect.objectContaining({ secure: true, port: 465 }),
        );
    });

    it("reuses singleton transporter across multiple sends", async () => {
        process.env.SMTP_HOST = "smtp.test.local";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_USER = "smtp-user";
        process.env.SMTP_PASS = "smtp-pass";

        mocks.sendMail.mockResolvedValue({} as never);

        const { sendPasswordResetEmail } = await import("@/lib/email");

        await sendPasswordResetEmail("first@test.local", "a");
        await sendPasswordResetEmail("second@test.local", "b");

        expect(mocks.createTransport).toHaveBeenCalledTimes(1);
        expect(mocks.sendMail).toHaveBeenCalledTimes(2);
    });
});
