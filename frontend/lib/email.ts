import { Resend } from "resend";

const FROM = "ResearchFlow <onboarding@resend.dev>";

export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[DEV] No RESEND_API_KEY set. Verification code:", code);
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM,
      to,
      subject: "ResearchFlow — Email Verification Code",
      html: `<p>Your verification code is: <strong style="font-size:24px">${code}</strong></p><p>This code expires in 10 minutes.</p>`,
    });
    return true;
  } catch (e) {
    console.error("Failed to send verification email:", e);
    return false;
  }
}
