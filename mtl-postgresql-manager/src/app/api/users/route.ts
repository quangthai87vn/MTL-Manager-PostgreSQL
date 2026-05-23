import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listUsers, createUser, dropUser, validateUserName } from "@/lib/postgres";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch users",
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { username, password } = await request.json();

    if (!username || !validateUserName(username)) {
      return NextResponse.json(
        { success: false, error: "Tên người dùng không hợp lệ" },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Mật khẩu phải có ít nhất 8 ký tự" },
        { status: 400 }
      );
    }

    await createUser(username, password);

    await createAuditLog({
      action: "CREATE_USER",
      target: username,
      userId: user?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}
