import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJWT } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Email and code are required" } },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: { code: "ALREADY_VERIFIED", message: "Email already verified" } },
        { status: 400 }
      );
    }

    if (!user.verificationCode || !user.verificationExp) {
      return NextResponse.json(
        { error: { code: "NO_CODE", message: "No verification code found. Please register again." } },
        { status: 400 }
      );
    }

    if (new Date() > user.verificationExp) {
      return NextResponse.json(
        { error: { code: "EXPIRED", message: "Verification code expired. Please request a new one." } },
        { status: 400 }
      );
    }

    if (user.verificationCode !== code) {
      return NextResponse.json(
        { error: { code: "INVALID_CODE", message: "Invalid verification code." } },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationCode: null,
        verificationExp: null,
      },
    });

    const token = await signJWT({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      data: { user: { id: user.id, name: user.name, email: user.email } },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Verification failed" } },
      { status: 500 }
    );
  }
}
