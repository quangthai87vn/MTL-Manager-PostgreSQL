import { Pool, PoolClient } from "pg";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

let defaultPool: Pool;

function getDefaultPool(): Pool {
  if (!defaultPool) {
    defaultPool = new Pool({
      host: process.env.POSTGRES_HOST || "mtl-postgresql",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "",
      database: process.env.POSTGRES_DB || "postgres",
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    defaultPool.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error:", err);
    });
  }
  return defaultPool;
}

// Cache for database-specific pools
const dbPools: Map<string, Pool> = new Map();

function getDatabasePool(database: string): Pool {
  if (!dbPools.has(database)) {
    const newPool = new Pool({
      host: process.env.POSTGRES_HOST || "mtl-postgresql",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "",
      database: database,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    dbPools.set(database, newPool);
  }
  return dbPools.get(database)!;
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[],
  database?: string
): Promise<T[]> {
  const pgPool = database 
    ? getDatabasePool(database) 
    : getDefaultPool();
  
  const result = await pgPool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[],
  database?: string
): Promise<T | null> {
  const rows = await query<T>(text, params, database);
  return rows[0] || null;
}

const DB_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;
const USER_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

export function validateDbName(name: string): boolean {
  return DB_NAME_REGEX.test(name);
}

export function validateUserName(name: string): boolean {
  return USER_NAME_REGEX.test(name);
}

export async function listDatabases(): Promise<
  Array<{ datname: string; size: string; owner: string }>
> {
  const rows = await query<{
    datname: string;
    size: string;
    pg_size_pretty: string;
    rolname: string;
  }>(`
    SELECT d.datname,
           pg_size_pretty(pg_database_size(d.datname)) as size,
           r.rolname as owner
    FROM pg_database d
    JOIN pg_roles r ON d.datdba = r.oid
    WHERE d.datistemplate = false
    ORDER BY d.datname
  `);
  return rows.map((r) => ({
    datname: r.datname,
    size: r.pg_size_pretty,
    owner: r.rolname,
  }));
}

export async function createDatabase(
  name: string,
  owner?: string
): Promise<void> {
  if (owner) {
    await query(`CREATE DATABASE "${name}" WITH OWNER = "${owner}"`);
  } else {
    await query(`CREATE DATABASE "${name}"`);
  }
}

export async function dropDatabase(name: string): Promise<void> {
  await query(`DROP DATABASE IF EXISTS "${name}"`);
}

export async function renameDatabase(
  oldName: string,
  newName: string
): Promise<void> {
  await query(`ALTER DATABASE "${oldName}" RENAME TO "${newName}"`);
}

export async function listUsers(): Promise<
  Array<{
    usename: string;
    rolsuper: boolean;
    rolinherit: boolean;
    rolcreatedb: boolean;
    rolcreaterole: boolean;
    rolcanlogin: boolean;
  }>
> {
  return query(`
    SELECT rolname as usename, rolsuper, rolinherit, rolcreatedb, rolcreaterole, rolcanlogin
    FROM pg_roles
    WHERE rolname NOT LIKE 'pg_%'
    AND rolname NOT LIKE 'sql_%'
    ORDER BY rolname
  `);
}

export async function createUser(
  username: string,
  password: string
): Promise<void> {
  // Escape single quotes in password
  const escapedPassword = password.replace(/'/g, "''");
  await query(`CREATE USER "${username}" WITH PASSWORD '${escapedPassword}'`);
}

export async function dropUser(username: string): Promise<void> {
  await query(`DROP USER IF EXISTS "${username}"`);
}

export async function changeUserPassword(
  username: string,
  password: string
): Promise<void> {
  // Escape single quotes in password
  const escapedPassword = password.replace(/'/g, "''");
  await query(`ALTER USER "${username}" WITH PASSWORD '${escapedPassword}'`);
}

export async function grantConnect(database: string, username: string): Promise<void> {
  await query(`GRANT CONNECT ON DATABASE "${database}" TO "${username}"`);
}

export async function revokeConnect(database: string, username: string): Promise<void> {
  await query(`REVOKE CONNECT ON DATABASE "${database}" FROM "${username}"`);
}

export async function grantSchemaAccess(
  database: string,
  username: string
): Promise<void> {
  await query(
    `GRANT USAGE ON SCHEMA public TO "${username}"`,
    undefined
  );
  await query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${username}"`,
    undefined
  );
  await query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${username}"`,
    undefined
  );
}

export async function revokeSchemaAccess(
  database: string,
  username: string
): Promise<void> {
  await query(`REVOKE ALL PRIVILEGES ON DATABASE "${database}" FROM "${username}"`);
}

export async function listPermissions(
  database: string
): Promise<Array<{ grantee: string; privilege_type: string; object_type: string }>> {
  // Create a dedicated connection to the specific database
  const dbPool = new Pool({
    host: process.env.POSTGRES_HOST || "mtl-postgresql",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.PGPASSWORD || "",
    database: database,
  });

  try {
    const result = await dbPool.query(`
      SELECT grantee, privilege_type, object_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
      AND grantee NOT LIKE 'pg_%'
      ORDER BY grantee, privilege_type
    `);
    return result.rows;
  } finally {
    await dbPool.end();
  }
}

const BACKUP_DIR = "/backups";

export async function createBackup(
  database: string
): Promise<{ filename: string; filePath: string }> {
  const filename = `${database}_${Date.now()}.dump`;
  const filePath = join(BACKUP_DIR, filename);

  // Just verify database exists - pg_dump will fail if not
  const exists = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) as exists`,
    [database]
  );

  if (!exists?.exists) {
    throw new Error(`Database "${database}" does not exist`);
  }

  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
    const pgDump = spawn("pg_dump", [
      "-h",
      process.env.POSTGRES_HOST || "mtl-postgresql",
      "-p",
      process.env.POSTGRES_PORT || "5432",
      "-U",
      process.env.POSTGRES_USER || "postgres",
      "-Fc",
      "-f",
      filePath,
      database,
    ], {
      env: {
        ...process.env,
        PGPASSWORD: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "",
      },
    });

    pgDump.on("close", (code: number) => {
      if (code === 0) {
        resolve({ filename, filePath });
      } else {
        reject(new Error(`pg_dump exited with code ${code}`));
      }
    });

    pgDump.on("error", (err: Error) => {
      reject(err);
    });
  });
}

export async function listBackups(): Promise<
  Array<{ filename: string; size: number; createdAt: Date }>
> {
  const { readdirSync, statSync } = require("fs");
  const backups: Array<{ filename: string; size: number; createdAt: Date }> = [];

  try {
    const files = readdirSync(BACKUP_DIR);
    for (const file of files) {
      if (
        file.endsWith(".dump") ||
        file.endsWith(".sql") ||
        file.endsWith(".backup")
      ) {
        const filePath = join(BACKUP_DIR, file);
        const stats = statSync(filePath);
        backups.push({
          filename: file,
          size: stats.size,
          createdAt: stats.mtime,
        });
      }
    }
  } catch {
    // Directory might not exist yet
  }

  return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deleteBackupFile(filename: string): Promise<void> {
  const filePath = join(BACKUP_DIR, filename);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

export async function restoreBackup(
  backupFilename: string,
  targetDatabase: string,
  mode: "NEW_DB" | "OVERWRITE"
): Promise<void> {
  const backupPath = join(BACKUP_DIR, backupFilename);

  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupFilename}`);
  }

  // Check file header to determine format
  const fileHeader = await readFileHeader(backupPath);
  const isCustomFormat = isPgCustomFormat(fileHeader);

  if (mode === "NEW_DB") {
    const exists = await queryOne<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) as exists`,
      [targetDatabase]
    );
    if (!exists?.exists) {
      await createDatabase(targetDatabase);
    }
  }

  if (isCustomFormat) {
    return restoreWithPgRestore(backupPath, targetDatabase, mode);
  } else {
    // Use psql for plain SQL dumps
    return restoreWithPsql(backupPath, targetDatabase, mode);
  }
}

async function readFileHeader(filePath: string): Promise<Buffer> {
  const { readFileSync } = require("fs");
  const buffer = Buffer.alloc(16);
  const fd = require("fs").openSync(filePath, "r");
  require("fs").readSync(fd, buffer, 0, 16, 0);
  require("fs").closeSync(fd);
  return buffer;
}

function isPgCustomFormat(header: Buffer): boolean {
  // PostgreSQL custom format starts with "PGDMP"
  // Plain SQL starts with "-- PostgreSQL database dump"
  if (header.includes(Buffer.from("PGDMP"))) {
    return true;
  }
  return false;
}

async function restoreWithPgRestore(
  backupPath: string,
  targetDatabase: string,
  mode: "NEW_DB" | "OVERWRITE"
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");

    const args = [
      "-h",
      process.env.POSTGRES_HOST || "mtl-postgresql",
      "-p",
      process.env.POSTGRES_PORT || "5432",
      "-U",
      process.env.POSTGRES_USER || "postgres",
      "-d",
      targetDatabase,
    ];

    if (mode === "OVERWRITE") {
      args.push("--clean", "--if-exists");
    }

    args.push(backupPath);

    const pgRestore = spawn("pg_restore", args, {
      env: {
        ...process.env,
        PGPASSWORD: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "",
      },
    });

    let stderr = "";
    pgRestore.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    pgRestore.on("close", (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_restore exited with code ${code}: ${stderr}`));
      }
    });

    pgRestore.on("error", (err: Error) => {
      reject(err);
    });
  });
}

async function restoreWithPsql(
  backupPath: string,
  targetDatabase: string,
  mode: "NEW_DB" | "OVERWRITE"
): Promise<void> {
  if (mode === "OVERWRITE") {
    await query(`DROP SCHEMA IF EXISTS public CASCADE`);
    await query(`CREATE SCHEMA public`);
  }

  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");

    const args = [
      "-h",
      process.env.POSTGRES_HOST || "mtl-postgresql",
      "-p",
      process.env.POSTGRES_PORT || "5432",
      "-U",
      process.env.POSTGRES_USER || "postgres",
      "-d",
      targetDatabase,
      "-f",
      backupPath,
    ];

    const psql = spawn("psql", args, {
      env: {
        ...process.env,
        PGPASSWORD: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "",
      },
    });

    let stderr = "";
    psql.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    psql.on("close", (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`psql exited with code ${code}: ${stderr}`));
      }
    });

    psql.on("error", (err: Error) => {
      reject(err);
    });
  });
}

export async function restoreSqlBackup(
  backupFilename: string,
  targetDatabase: string,
  mode: "NEW_DB" | "OVERWRITE"
): Promise<void> {
  const backupPath = join(BACKUP_DIR, backupFilename);

  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupFilename}`);
  }

  if (mode === "NEW_DB") {
    // Create database if not exists
    const exists = await queryOne<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) as exists`,
      [targetDatabase]
    );
    if (!exists?.exists) {
      await createDatabase(targetDatabase);
    }
  } else {
    // OVERWRITE mode: drop and recreate schema
    await query(`DROP SCHEMA IF EXISTS public CASCADE`);
    await query(`CREATE SCHEMA public`);
  }

  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");

    const args = [
      "-h",
      process.env.POSTGRES_HOST || "mtl-postgresql",
      "-p",
      process.env.POSTGRES_PORT || "5432",
      "-U",
      process.env.POSTGRES_USER || "postgres",
      "-d",
      targetDatabase,
      "-f",
      backupPath,
    ];

    const psql = spawn("psql", args, {
      env: {
        ...process.env,
        PGPASSWORD: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "",
      },
    });

    let stderr = "";
    psql.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    psql.on("close", (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`psql exited with code ${code}: ${stderr}`));
      }
    });

    psql.on("error", (err: Error) => {
      reject(err);
    });
  });
}

export async function checkConnection(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  version?: string;
  database?: string;
}

export async function testConnection(
  hostname: string,
  port: string | number,
  username: string,
  password: string,
  database: string
): Promise<TestConnectionResult> {
  const testPool = new Pool({
    host: hostname || process.env.POSTGRES_HOST || "mtl-postgresql",
    port: parseInt(String(port)) || parseInt(process.env.POSTGRES_PORT || "5432"),
    user: username,
    password: password,
    database: database,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await testPool.query("SELECT version()");
    return {
      success: true,
      message: "Kết nối thành công!",
      version: result.rows[0].version,
      database: database,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Kết nối thất bại: ${errorMessage}`,
    };
  } finally {
    await testPool.end();
  }
}

export async function getDatabaseSize(): Promise<string> {
  const result = await queryOne<{ pg_size_pretty: string }>(`
    SELECT pg_size_pretty(SUM(pg_database_size(datname))) as pg_size_pretty
    FROM pg_database
    WHERE datistemplate = false
  `);
  return result?.pg_size_pretty || "0 B";
}

export async function getConnectionStats(): Promise<{
  version: string;
  databases: number;
  users: number;
  size: string;
}> {
  const versionResult = await queryOne<{ version: string }>(
    "SELECT version()"
  );
  const dbCount = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM pg_database WHERE datistemplate = false"
  );
  const userCount = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM pg_roles WHERE rolname NOT LIKE 'pg_%' AND rolname NOT LIKE 'sql_%'"
  );
  const size = await getDatabaseSize();

  return {
    version: versionResult?.version?.split(" ")[1] || "Unknown",
    databases: parseInt(dbCount?.count || "0"),
    users: parseInt(userCount?.count || "0"),
    size,
  };
}
