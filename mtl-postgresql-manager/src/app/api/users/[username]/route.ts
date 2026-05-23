import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dropUser, changeUserPassword, validateUserName } from "@/lib/postgres";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { username } = await params;
    const { password } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Mật khẩu phải có ít nhất 8 ký tự" },
        { status: 400 }
      );
    }

    await changeUserPassword(username, password);

    await createAuditLog({
      action: "CHANGE_PASSWORD",
      target: username,
      userId: user?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { username } = await params;

    if (username === "postgres") {
      return NextResponse.json(
        { success: false, error: "Không thể xóa user postgres" },
        { status: 400 }
      );
    }

    await dropUser(username);

    await createAuditLog({
      action: "DELETE_USER",
      target: username,
      userId: user?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
