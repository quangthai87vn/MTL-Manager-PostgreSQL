import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  grantConnect,
  grantSchemaAccess,
  revokeConnect,
  revokeSchemaAccess,
  listDatabases,
  listUsers,
  query,
} from "@/lib/postgres";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const databases = await listDatabases();
    const users = await listUsers();

    const permissions: Record<string, Record<string, string[]>> = {};

    for (const db of databases) {
      permissions[db.datname] = {};
      for (const pgUser of users) {
        if (!pgUser.rolcanlogin) continue;
        try {
          const result = await query<{ privilege_type: string }>(`
            SELECT privilege_type
            FROM information_schema.database_privileges
            WHERE grantee = '${pgUser.usename}'
            AND object_schema = 'public'
            AND object_type = 'DATABASE'
            AND object_catalog = '${db.datname}'
          `);
          permissions[db.datname][pgUser.usename] = result.map((r) => r.privilege_type);
        } catch {
          permissions[db.datname][pgUser.usename] = [];
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { databases, users, permissions },
    });
  } catch (error) {
    console.error("List permissions error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch permissions",
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { database, username, permission } = await request.json();

    if (permission === "CONNECT") {
      await grantConnect(database, username);
    } else if (permission === "READ_WRITE") {
      await grantConnect(database, username);
      await grantSchemaAccess(database, username);
    } else if (permission === "OWNER") {
      await query(`GRANT ALL PRIVILEGES ON DATABASE "${database}" TO "${username}"`);
      await query(`GRANT ALL PRIVILEGES ON SCHEMA public TO "${username}"`);
    }

    await createAuditLog({
      action: "GRANT_PERMISSION",
      target: `${username}@${database}`,
      userId: user?.id,
      details: { permission },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Grant permission error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to grant permission" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    const { database, username } = await request.json();

    await revokeConnect(database, username);
    await revokeSchemaAccess(database, username);

    await createAuditLog({
      action: "REVOKE_PERMISSION",
      target: `${username}@${database}`,
      userId: user?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke permission error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke permission" },
      { status: 500 }
    );
  }
}
