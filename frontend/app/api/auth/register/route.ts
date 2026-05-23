import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJWT } from "@/lib/jwt";
import { z } from "zod";
import bcrypt from "bcryptjs";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

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

    // Whitelist check for closed beta
    const whitelist = (process.env.REGISTER_WHITELIST || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (whitelist.length > 0 && !whitelist.includes(email.toLowerCase())) {
      return NextResponse.json(
        { error: { code: "NOT_INVITED", message: "This app is in closed beta. Please contact the admin for access." } },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Email already registered" } },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
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
      { error: { code: "SERVER_ERROR", message: "Registration failed" } },
      { status: 500 }
    );
  }
}
