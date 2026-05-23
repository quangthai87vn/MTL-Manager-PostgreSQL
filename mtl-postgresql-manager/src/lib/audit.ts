import { prisma } from "./prisma";

export type AuditAction =
  | "CREATE_DB"
  | "DELETE_DB"
  | "RENAME_DB"
  | "CREATE_USER"
  | "DELETE_USER"
  | "CHANGE_PASSWORD"
  | "GRANT_PERMISSION"
  | "REVOKE_PERMISSION"
  | "RESTORE_DB"
  | "BACKUP_DB"
  | "DELETE_BACKUP"
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_BACKUP"
  | "DELETE_BACKUP"
  | "UPLOAD_BACKUP"
  | "LOGIN_FAILED";

export interface AuditLogInput {
  action: AuditAction;
  target: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userId?: string;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      target: input.target,
      details: input.details ? JSON.stringify(input.details) : null,
      ipAddress: input.ipAddress || null,
      userId: input.userId || null,
    },
  });
}

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { page = 1, limit = 20, action, startDate, endDate } = params;

  const where: Record<string, unknown> = {};

  if (action) {
    where.action = action;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Record<string, Date>).gte = startDate;
    }
    if (endDate) {
      (where.createdAt as Record<string, Date>).lte = endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      id: Number(log.id),
      userId: log.userId ? String(log.userId) : null,
      username: log.user?.username || "System",
    })),
    total: Number(total),
    totalPages: Math.ceil(Number(total) / limit),
    page,
  };
}

export async function createBackupLog(params: {
  filename: string;
  databaseName: string;
  fileSize: number;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  userId?: string;
}) {
  return prisma.backupLog.create({
    data: {
      ...params,
      fileSize: BigInt(params.fileSize),
    },
  });
}

export async function getBackupLogs(params: {
  page?: number;
  limit?: number;
  databaseName?: string;
  status?: string;
}) {
  const { page = 1, limit = 20, databaseName, status } = params;

  const where: Record<string, unknown> = {};
  if (databaseName) where.databaseName = databaseName;
  if (status) where.status = status;

  const [logs, total] = await Promise.all([
    prisma.backupLog.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.backupLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      id: Number(log.id),
      fileSize: Number(log.fileSize),
      userId: log.userId ? String(log.userId) : null,
      username: log.user?.username || "System",
    })),
    total: Number(total),
    totalPages: Math.ceil(Number(total) / limit),
    page,
  };
}

export async function createRestoreLog(params: {
  filename: string;
  sourceDatabase: string;
  targetDatabase: string;
  mode: "NEW_DB" | "OVERWRITE";
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  userId?: string;
}) {
  return prisma.restoreLog.create({
    data: params,
  });
}

export async function getRestoreLogs(params: {
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = params;

  const [logs, total] = await Promise.all([
    prisma.restoreLog.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.restoreLog.count(),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      username: log.user?.username || "System",
    })),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}
