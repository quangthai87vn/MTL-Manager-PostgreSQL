import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateUser, SESSION_COOKIE } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ thông tin" },
        { status: 400 }
      );
    }

    const sessionId = await authenticateUser(username, password);

    if (!sessionId) {
      await createAuditLog({
        action: "LOGIN_FAILED",
        target: username,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json(
        { success: false, error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    await createAuditLog({
      action: "LOGIN",
      target: username,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Đã xảy ra lỗi server" },
      { status: 500 }
    );
  }
}
