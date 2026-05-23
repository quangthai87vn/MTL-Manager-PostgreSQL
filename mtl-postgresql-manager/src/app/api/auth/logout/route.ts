import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logout, getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (user) {
      await createAuditLog({
        action: "LOGOUT",
        target: user.username,
        userId: user.id,
      });
    }

    await logout();

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Đã xảy ra lỗi" },
      { status: 500 }
    );
  }
}
