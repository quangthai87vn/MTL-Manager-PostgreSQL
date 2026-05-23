"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Users,
  HardDrive,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DashboardStats {
  connected: boolean;
  version: string;
  databases: number;
  users: number;
  size: string;
  latestBackups: Array<{
    filename: string;
    databaseName: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-slate-100" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Connection Status */}
      <Card className={stats?.connected ? "border-green-500" : "border-red-500"}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {stats?.connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Kết nối PostgreSQL thành công</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span>Không thể kết nối PostgreSQL</span>
              </>
            )}
          </CardTitle>
          <CardDescription>
            {stats?.connected
              ? `PostgreSQL ${stats.version}`
              : "Vui lòng kiểm tra Docker container và cấu hình"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng số Database
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.databases || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng số User
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dung lượng Database
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.size || "0 B"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Phiên bản PostgreSQL
            </CardTitle>
            <Badge variant="outline">{stats?.version || "N/A"}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PostgreSQL</div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Sao lưu gần đây
          </CardTitle>
          <CardDescription>Danh sách các bản sao lưu gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.latestBackups && stats.latestBackups.length > 0 ? (
            <div className="space-y-3">
              {stats.latestBackups.map((backup, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{backup.databaseName}</p>
                      <p className="text-sm text-muted-foreground">
                        {backup.filename}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(backup.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Chưa có bản sao lưu nào
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
