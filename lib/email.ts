/**
 * Email utility — Nodemailer SMTP transport (Singleton)
 *
 * Provides a singleton transporter and a helper to send password-reset emails.
 * All SMTP settings are pulled from environment variables.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import path from "path";

/** Singleton transporter — reuses SMTP connection across invocations */
let cachedTransporter: Transporter | null = null;

/**
 * Get or create the singleton Nodemailer SMTP transporter.
 * Throws at call-time if required env vars are missing.
 */
function getTransporter(): Transporter {
    if (cachedTransporter) return cachedTransporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error(
            "Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env",
        );
    }

    cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });

    return cachedTransporter;
}

/**
 * Send a password-reset email with a one-time link.
 *
 * @param email - Recipient email address
 * @param token - Password-reset token (used in the link)
 */
export async function sendPasswordResetEmail(
    email: string,
    token: string,
): Promise<void> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const from = process.env.SMTP_FROM ?? "Krunangfah <noreply@krunangfah.com>";
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,219,135,0.1);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(180deg,#00DB87,#00C67A);padding:28px 24px;text-align:center;">
        <div style="display:inline-block;background:#ffffff;border-radius:16px;padding:8px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <img src="cid:logo" alt="ครูนางฟ้า" width="160" height="60" style="display:block;max-width:160px;height:auto;" />
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
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <a href="${resetLink}" style="display:inline-block;background:linear-gradient(180deg,#00DB87,#00C67A);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:9999px;font-size:16px;font-weight:600;">
                ตั้งรหัสผ่านใหม่
              </a>
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
        <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Kru Nangfah Project</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const transporter = getTransporter();

    await transporter.sendMail({
        from,
        to: email,
        subject: "รีเซ็ตรหัสผ่าน — Krunangfah",
        html,
        attachments: [
            {
                filename: "logo.png",
                path: path.join(process.cwd(), "public/image/homepage/icon 1.png"),
                cid: "logo",
            },
        ],
    });
}
