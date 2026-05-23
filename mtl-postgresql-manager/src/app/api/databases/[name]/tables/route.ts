import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/postgres";

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    await getCurrentUser();
    const database = decodeURIComponent(params.name);

    if (!database) {
      return NextResponse.json(
        { success: false, error: "Database name is required" },
        { status: 400 }
      );
    }

    const tables = await query<{
      schemaname: string;
      tablename: string;
      tableowner: string;
      tablespace: string;
      hasindexes: boolean;
      hasrules: boolean;
      hastriggers: boolean;
    }>(
      `SELECT 
        schemaname,
        tablename,
        tableowner,
        tablespace,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_catalog.pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename`,
      undefined,
      database
    );

    return NextResponse.json({
      success: true,
      data: tables.map((t) => ({
        schema: t.schemaname,
        name: t.tablename,
        owner: t.tableowner,
        hasIndexes: t.hasindexes,
        hasRules: t.hasrules,
        hasTriggers: t.hastriggers,
      })),
    });
  } catch (error) {
    console.error("List tables error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list tables" },
      { status: 500 }
    );
  }
}
