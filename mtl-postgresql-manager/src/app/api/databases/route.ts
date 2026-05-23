import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listDatabases, validateDbName, createDatabase, dropDatabase, renameDatabase } from "@/lib/postgres";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const databases = await listDatabases();

    return NextResponse.json({
      success: true,
      data: databases,
    });
  } catch (error) {
    console.error("List databases error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch databases",
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { name, owner } = await request.json();

    if (!name || !validateDbName(name)) {
      return NextResponse.json(
        { success: false, error: "Tên cơ sở dữ liệu không hợp lệ. Chỉ dùng a-z, A-Z, 0-9, dấu gạch dưới, tối đa 63 ký tự, bắt đầu bằng chữ cái." },
        { status: 400 }
      );
    }

    await createDatabase(name, owner);

    await createAuditLog({
      action: "CREATE_DB",
      target: name,
      userId: user?.id,
      details: { owner },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create database error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create database" },
      { status: 500 }
    );
  }
}
