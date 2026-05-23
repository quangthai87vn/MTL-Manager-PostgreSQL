"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  User,
  Shield,
  Download,
  Upload,
  Key,
  LogIn,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  target: string;
  details: string | null;
  username: string;
  createdAt: string;
  ipAddress: string | null;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE_DB: <Database className="h-4 w-4" />,
  DELETE_DB: <Database className="h-4 w-4" />,
  RENAME_DB: <Database className="h-4 w-4" />,
  CREATE_USER: <User className="h-4 w-4" />,
  DELETE_USER: <User className="h-4 w-4" />,
  CHANGE_PASSWORD: <Key className="h-4 w-4" />,
  GRANT_PERMISSION: <Shield className="h-4 w-4" />,
  REVOKE_PERMISSION: <Shield className="h-4 w-4" />,
  BACKUP_DB: <Download className="h-4 w-4" />,
  RESTORE_DB: <Upload className="h-4 w-4" />,
  LOGIN: <LogIn className="h-4 w-4" />,
  LOGOUT: <LogOut className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_DB: "bg-blue-100 text-blue-800",
  DELETE_DB: "bg-red-100 text-red-800",
  RENAME_DB: "bg-blue-100 text-blue-800",
  CREATE_USER: "bg-green-100 text-green-800",
  DELETE_USER: "bg-red-100 text-red-800",
  CHANGE_PASSWORD: "bg-orange-100 text-orange-800",
  GRANT_PERMISSION: "bg-purple-100 text-purple-800",
  REVOKE_PERMISSION: "bg-purple-100 text-purple-800",
  BACKUP_DB: "bg-cyan-100 text-cyan-800",
  RESTORE_DB: "bg-cyan-100 text-cyan-800",
  LOGIN: "bg-gray-100 text-gray-800",
  LOGOUT: "bg-gray-100 text-gray-800",
  LOGIN_FAILED: "bg-red-100 text-red-800",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadLogs = () => {
    setLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
    });

    if (actionFilter && actionFilter !== "all") {
      params.append("action", actionFilter);
    }
    if (startDate) {
      params.append("startDate", startDate);
    }
    if (endDate) {
      params.append("endDate", endDate);
    }

    fetch(`/api/audit-logs?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.data);
          setTotalPages(data.totalPages);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, startDate, endDate]);

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase()) ||
      log.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nhật ký hoạt động</h1>
        <p className="text-muted-foreground">
          Theo dõi các thao tác trên hệ thống
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Loại thao tác" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="CREATE_DB">Tạo DB</SelectItem>
                  <SelectItem value="DELETE_DB">Xóa DB</SelectItem>
                  <SelectItem value="CREATE_USER">Tạo User</SelectItem>
                  <SelectItem value="DELETE_USER">Xóa User</SelectItem>
                  <SelectItem value="CHANGE_PASSWORD">Đổi mật khẩu</SelectItem>
                  <SelectItem value="GRANT_PERMISSION">Grant quyền</SelectItem>
                  <SelectItem value="BACKUP_DB">Backup</SelectItem>
                  <SelectItem value="RESTORE_DB">Restore</SelectItem>
                  <SelectItem value="LOGIN">Đăng nhập</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không có nhật ký
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                  >
                    <div
                      className={`p-2 rounded-full ${
                        ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {ACTION_ICONS[log.action] || <History className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className="font-medium">{log.target}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.username} • {formatDate(log.createdAt)}
                        {log.ipAddress && ` • ${log.ipAddress}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Trước
                </Button>
                <span className="text-sm text-muted-foreground">
                  Trang {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Sau
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
