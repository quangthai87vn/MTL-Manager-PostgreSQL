import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { restoreBackup } from "@/lib/postgres";
import { createRestoreLog, createAuditLog } from "@/lib/audit";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const BACKUP_DIR = "/backups";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const targetDatabase = formData.get("targetDatabase") as string;
    const mode = formData.get("mode") as "NEW_DB" | "OVERWRITE";
    const sourceFile = formData.get("sourceFile") as string | null;

    // Ensure backup directory exists
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Upload only mode - just save the file
    if (file && targetDatabase === "upload") {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = file.name;
      const uploadPath = join(BACKUP_DIR, filename);
      writeFileSync(uploadPath, buffer);

      await createAuditLog({
        action: "UPLOAD_BACKUP",
        target: filename,
        userId: user?.id,
        details: { size: file.size },
      });

      return NextResponse.json({ success: true, filename });
    }

    // Restore mode
    if (!targetDatabase || (!file && !sourceFile)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    let filename: string;

    if (file) {
      // Upload new file and restore
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      filename = file.name;
      const uploadPath = join(BACKUP_DIR, filename);
      writeFileSync(uploadPath, buffer);
    } else {
      filename = sourceFile!;
    }

    // restoreBackup now auto-detects format (custom .dump vs plain .sql)
    await restoreBackup(filename, targetDatabase, mode);

    await createRestoreLog({
      filename,
      sourceDatabase: targetDatabase,
      targetDatabase,
      mode,
      status: "SUCCESS",
      userId: user?.id,
    });

    await createAuditLog({
      action: "RESTORE_DB",
      target: targetDatabase,
      userId: user?.id,
      details: { filename, mode },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restore backup error:", error);

    // Create failed log
    try {
      const formData = await request.formData();
      const targetDatabase = formData.get("targetDatabase") as string;
      const sourceFile = formData.get("sourceFile") as string;
      const mode = formData.get("mode") as "NEW_DB" | "OVERWRITE";

      await createRestoreLog({
        filename: sourceFile || "unknown",
        sourceDatabase: targetDatabase,
        targetDatabase,
        mode: mode || "NEW_DB",
        status: "FAILED",
        userId: undefined,
      });
    } catch (logError) {
      console.error("Failed to create restore log:", logError);
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
