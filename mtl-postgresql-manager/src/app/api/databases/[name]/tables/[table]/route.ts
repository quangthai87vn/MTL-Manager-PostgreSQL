import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Pool } from "pg";

export async function GET(
  request: Request,
  { params }: { params: { name: string; table: string } }
) {
  try {
    await getCurrentUser();
    const database = params.name;
    const table = params.table;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    if (!database || !table) {
      return NextResponse.json(
        { success: false, error: "Database and table name are required" },
        { status: 400 }
      );
    }

    const pool = new Pool({
      host: process.env.POSTGRES_HOST || "mtl-postgresql",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.PGPASSWORD || "",
      database: database,
    });

    try {
      // Get primary key columns
      const pkResult = await pool.query<{ column_name: string }>(
        `SELECT a.attname as column_name
         FROM pg_index i
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
         WHERE i.indrelid = $1::regclass
         AND i.indisprimary`,
        [table]
      );
      const primaryKeys = new Set(pkResult.rows.map(r => r.column_name));

      // Get foreign key columns
      const fkResult = await pool.query<{ column_name: string }>(
        `SELECT DISTINCT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_name = $1
           AND tc.table_schema = 'public'`,
        [table]
      );
      const foreignKeys = new Set(fkResult.rows.map(r => r.column_name));

      // Get columns info
      const columnsResult = await pool.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );

      // Get constraints
      const constraintsResult = await pool.query<{
        constraint_name: string;
        constraint_type: string;
        column_name: string;
        definition: string;
      }>(
        `SELECT
           tc.constraint_name,
           tc.constraint_type,
           kcu.column_name,
           CASE
             WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PRIMARY KEY (' || kcu.column_name || ')'
             WHEN tc.constraint_type = 'UNIQUE' THEN 'UNIQUE (' || kcu.column_name || ')'
             WHEN tc.constraint_type = 'FOREIGN KEY' THEN
               'REFERENCES ' || ccu.table_name || ' (' || ccu.column_name || ')'
             ELSE ''
           END as definition
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         LEFT JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema
         WHERE tc.table_name = $1
           AND tc.table_schema = 'public'
         ORDER BY tc.constraint_type, kcu.column_name`,
        [table]
      );

      // Group constraints
      const constraintsMap = new Map<string, { type: string; columns: string[]; definition: string }>();
      for (const row of constraintsResult.rows) {
        if (!constraintsMap.has(row.constraint_name)) {
          constraintsMap.set(row.constraint_name, {
            type: row.constraint_type,
            columns: [],
            definition: row.definition,
          });
        }
        constraintsMap.get(row.constraint_name)!.columns.push(row.column_name);
      }

      const constraints = Array.from(constraintsMap.entries()).map(([name, data]) => ({
        name,
        type: data.type,
        columns: data.columns,
        definition: data.definition,
      }));

      // Get indexes
      const indexesResult = await pool.query<{
        indexname: string;
        column_name: string;
        indisunique: boolean;
        indisprimary: boolean;
      }>(
        `SELECT
           i.relname as indexname,
           a.attname as column_name,
           idx.indisunique,
           idx.indisprimary
         FROM pg_index idx
         JOIN pg_class c ON idx.indrelid = c.oid
         JOIN pg_class i ON idx.indexrelid = i.oid
         JOIN pg_namespace n ON c.relnamespace = n.oid
         JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(idx.indkey)
         WHERE c.relname = $1
           AND n.nspname = 'public'
         ORDER BY i.relname, a.attnum`,
        [table]
      );

      // Group indexes
      const indexesMap = new Map<string, { columns: string[]; unique: boolean; isPrimary: boolean }>();
      for (const row of indexesResult.rows) {
        if (!indexesMap.has(row.indexname)) {
          indexesMap.set(row.indexname, {
            columns: [],
            unique: row.indisunique,
            isPrimary: row.indisprimary,
          });
        }
        indexesMap.get(row.indexname)!.columns.push(row.column_name);
      }

      const indexes = Array.from(indexesMap.entries()).map(([name, data]) => ({
        name,
        columns: data.columns,
        unique: data.unique,
        isPrimary: data.isPrimary,
      }));

      // Get total count
      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM "${table}"`
      );
      const total = parseInt(countResult.rows[0]?.count || "0");

      // Get data with pagination
      const dataResult = await pool.query(
        `SELECT * FROM "${table}" ORDER BY 1 LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return NextResponse.json({
        success: true,
        data: {
          columns: columnsResult.rows.map((c) => ({
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable === "YES",
            default: c.column_default,
            isPrimaryKey: primaryKeys.has(c.column_name),
            isForeignKey: foreignKeys.has(c.column_name),
          })),
          rows: dataResult.rows,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          constraints,
          indexes,
        },
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error("Get table data error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get table data" },
      { status: 500 }
    );
  }
}
