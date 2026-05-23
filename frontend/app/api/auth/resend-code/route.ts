import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Email is required" } },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ data: { message: "If the email exists, a new code has been sent." } });
    }

    if (user.emailVerified) {
      return NextResponse.json({ data: { message: "Email is already verified. You can log in." } });
    }

    const code = generateCode();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: code,
        verificationExp: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendVerificationEmail(email, code);

    return NextResponse.json({ data: { message: "If the email exists, a new code has been sent." } });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to resend code" } },
      { status: 500 }
    );
  }
}
