export interface Database {
  datname: string;
  size: string;
  owner: string;
}

export interface PgUser {
  usename: string;
  rolsuper: boolean;
  rolinherit: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolcanlogin: boolean;
}

export interface Permission {
  grantee: string;
  privilege_type: string;
  object_type: string;
}

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  target: string;
  details: string | null;
  ipAddress: string | null;
  userId: string | null;
  createdAt: Date;
  username: string;
}

export interface BackupLog {
  id: string;
  filename: string;
  databaseName: string;
  fileSize: bigint;
  status: string;
  errorMessage: string | null;
  userId: string | null;
  createdAt: Date;
  username: string;
}

export interface RestoreLog {
  id: string;
  filename: string;
  sourceDatabase: string;
  targetDatabase: string;
  mode: string;
  status: string;
  errorMessage: string | null;
  userId: string | null;
  createdAt: Date;
  username: string;
}

export interface DashboardStats {
  connected: boolean;
  version: string;
  databases: number;
  users: number;
  size: string;
  latestBackups: Array<{
    filename: string;
    databaseName: string;
    createdAt: Date;
  }>;
}

export interface AdminUser {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PermissionLevel =
  | "CONNECT"
  | "CREATE"
  | "READ_ONLY"
  | "READ_WRITE"
  | "OWNER";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
