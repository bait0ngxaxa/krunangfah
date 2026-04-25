/**
 * Email utility — Resend API transport with exponential-backoff retry
 *
 * Retry strategy: up to MAX_RETRIES attempts with jittered exponential backoff.
 * Only retryable HTTP status codes (429, 5xx) trigger a retry; 4xx validation
 * errors fail immediately to avoid wasting quota.
 */

import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300; // 300 → 600 → 1 200 ms

/** Resend error names that indicate a transient failure worth retrying. */
const RETRYABLE_ERROR_NAMES = new Set([
    "rate_limit_exceeded",      // 429
    "internal_server_error",    // 500
    "service_unavailable",      // 503
]);

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

/** Lazy singleton — one Resend client per process */
let client: Resend | null = null;

/**
 * Return (or create) the singleton Resend client.
 * Throws at call-time if the API key env var is missing.
 */
function getClient(): Resend {
    if (client) return client;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error("Missing RESEND_API_KEY. Add it to your .env file.");
    }

    client = new Resend(apiKey);
    return client;
}

// ---------------------------------------------------------------------------
// Retry helpers
// ---------------------------------------------------------------------------

/** Resolves after `ms` milliseconds. */
const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Returns true for transient Resend errors that are safe to retry
 * (rate-limit, 5xx).  Client-side validation errors (4xx) are not retried.
 */
function isRetryable(errorName: string): boolean {
    return RETRYABLE_ERROR_NAMES.has(errorName);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a password-reset email with a one-time link.
 * Retries up to MAX_RETRIES times with exponential backoff on transient errors.
 *
 * @param email - Recipient email address
 * @param token - Password-reset token (used in the link)
 */
export async function sendPasswordResetEmail(
    email: string,
    token: string,
): Promise<void> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const from = process.env.EMAIL_FROM ?? "Krunangfah <noreply@krucarejai.com>";
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const payload = {
        from,
        to: email,
        subject: "รีเซ็ตรหัสผ่าน — Krunangfah",
        html: buildPasswordResetHtml(resetLink, appUrl),
    };

    let lastErrorMessage = "unknown error";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { error } = await getClient().emails.send(payload);

        if (!error) return; // ✅ success

        lastErrorMessage = error.message;

        // Non-retryable (e.g. 4xx validation) — fail immediately
        if (!isRetryable(error.name)) {
            throw new Error(
                `Failed to send password-reset email: ${lastErrorMessage}`,
            );
        }

        // Retryable but exhausted all attempts
        if (attempt === MAX_RETRIES) break;

        // Exponential backoff: 300ms → 600ms → 1 200ms
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }

    throw new Error(
        `Failed to send password-reset email after ${MAX_RETRIES} attempts: ${lastErrorMessage}`,
    );
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Build the HTML body for the password-reset email. */
function buildPasswordResetHtml(resetLink: string, appUrl: string): string {
    const year = new Date().getFullYear();
    // Logo served from the public URL — no CID attachment needed with Resend
    const logoUrl = `${appUrl}/image/homepage/icon%201.png`;

    return `<!DOCTYPE html>
<html lang="th" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!--[if gte mso 9]><xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,219,135,0.1);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(180deg,#00DB87,#00C67A);padding:28px 24px;text-align:center;">
        <div style="display:inline-block;background:#ffffff;border-radius:16px;padding:8px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <img src="${logoUrl}" alt="ครูนางฟ้า" width="160" height="60" style="display:block;max-width:160px;height:auto;" />
        </div>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:32px 28px;">
        <h2 style="color:#1f2937;font-size:20px;margin:0 0 12px;">รีเซ็ตรหัสผ่าน</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
          เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center" style="padding:8px 0;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                href="${resetLink}"
                style="height:50px;v-text-anchor:middle;width:220px;"
                arcsize="50%"
                strokecolor="#00C67A"
                fillcolor="#00DB87">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:16px;font-weight:600;">ตั้งรหัสผ่านใหม่</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${resetLink}" style="background:#00DB87;border-radius:9999px;color:#ffffff;display:inline-block;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:16px;font-weight:600;line-height:50px;text-align:center;text-decoration:none;width:220px;-webkit-text-size-adjust:none;">ตั้งรหัสผ่านใหม่</a>
              <!--<![endif]-->
            </td>
          </tr>
        </table>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">
          ลิงก์นี้จะหมดอายุภายใน <strong>1 ชั่วโมง</strong> หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
          หากปุ่มไม่ทำงาน คัดลอก URL นี้ไปวางในเบราว์เซอร์:<br/>
          <a href="${resetLink}" style="color:#059669;word-break:break-all;">${resetLink}</a>
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background:#ecfdf5;padding:16px 24px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${year} Kru Nangfah Project</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
