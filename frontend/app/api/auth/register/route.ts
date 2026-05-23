import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Whitelist check
    const whitelist = (process.env.REGISTER_WHITELIST || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (whitelist.length > 0 && !whitelist.includes(email.toLowerCase())) {
      return NextResponse.json(
        { error: { code: "NOT_INVITED", message: "This app is in closed beta." } },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // If already verified, reject. If unverified, resend code.
      if (existing.emailVerified) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "Email already registered" } },
          { status: 409 }
        );
      }

      const newCode = generateCode();
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          verificationCode: newCode,
          verificationExp: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      await sendVerificationEmail(email, newCode);

      return NextResponse.json({
        data: { message: "Verification code resent. Please check your email." },
      });
    }

    const hashed = await bcrypt.hash(password, 12);
    const code = generateCode();

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        verificationCode: code,
        verificationExp: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const sent = await sendVerificationEmail(email, code);

    return NextResponse.json({
      data: {
        message: "Account created. Please check your email for the verification code.",
        devCode: process.env.NODE_ENV !== "production" ? code : undefined,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Registration failed" } },
      { status: 500 }
    );
  }
}
