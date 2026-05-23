import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dropDatabase, renameDatabase, validateDbName } from "@/lib/postgres";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { name } = await params;
    const { newName } = await request.json();

    if (!newName || !validateDbName(newName)) {
      return NextResponse.json(
        { success: false, error: "Tên mới không hợp lệ" },
        { status: 400 }
      );
    }

    await renameDatabase(name, newName);

    await createAuditLog({
      action: "RENAME_DB",
      target: name,
      userId: user?.id,
      details: { newName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rename database error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to rename database" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { name } = await params;

    if (name === "postgres") {
      return NextResponse.json(
        { success: false, error: "Không thể xóa database postgres" },
        { status: 400 }
      );
    }

    await dropDatabase(name);

    await createAuditLog({
      action: "DELETE_DB",
      target: name,
      userId: user?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete database error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete database" },
      { status: 500 }
    );
  }
}
