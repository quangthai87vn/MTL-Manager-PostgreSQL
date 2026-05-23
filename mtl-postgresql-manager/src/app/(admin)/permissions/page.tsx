"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Shield, Check, X } from "lucide-react";

interface PermissionData {
  databases: Array<{ datname: string; owner: string }>;
  users: Array<{ usename: string; rolcanlogin: boolean }>;
  permissions: Record<string, Record<string, string[]>>;
}

export default function PermissionsPage() {
  const [data, setData] = useState<PermissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDb, setSelectedDb] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [action, setAction] = useState<string>("");

  useEffect(() => {
    fetch("/api/permissions")
      .then((res) => res.json())
      .then((result: { success: boolean; data: PermissionData }) => {
        if (result.success && result.data) {
          setData(result.data);
          if (result.data.databases.length > 0) {
            setSelectedDb(result.data.databases[0].datname);
          }
          const loginUsers = result.data.users.filter((u) => u.rolcanlogin);
          if (loginUsers.length > 0) {
            setSelectedUser(loginUsers[0].usename);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGrant = async () => {
    if (!selectedDb || !selectedUser || !action) {
      toast.error("Vui lòng chọn đầy đủ thông tin");
      return;
    }

    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        database: selectedDb,
        username: selectedUser,
        permission: action,
      }),
    });

    const result = await res.json();

    if (result.success) {
      toast.success(`Đã phân quyền ${action} cho ${selectedUser} trên ${selectedDb}`);
      // Reload permissions
      fetch("/api/permissions")
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            setData(result.data);
          }
        });
    } else {
      toast.error(result.error || "Không thể phân quyền");
    }
  };

  const handleRevoke = async () => {
    if (!selectedDb || !selectedUser) {
      toast.error("Vui lòng chọn database và user");
      return;
    }

    const res = await fetch("/api/permissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        database: selectedDb,
        username: selectedUser,
      }),
    });

    const result = await res.json();

    if (result.success) {
      toast.success(`Đã thu hồi quyền của ${selectedUser} trên ${selectedDb}`);
      fetch("/api/permissions")
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            setData(result.data);
          }
        });
    } else {
      toast.error(result.error || "Không thể thu hồi quyền");
    }
  };

  const getCurrentPermission = () => {
    if (!data || !selectedDb || !selectedUser) return [];
    return data.permissions[selectedDb]?.[selectedUser] || [];
  };

  const loginUsers = data?.users.filter((u) => u.rolcanlogin) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Phân quyền</h1>
        <p className="text-muted-foreground">
          Quản lý quyền truy cập database cho users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Phân quyền Database
          </CardTitle>
          <CardDescription>
            Grant hoặc revoke quyền truy cập cho PostgreSQL users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Database</label>
                  <Select value={selectedDb} onValueChange={setSelectedDb}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn database" />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.databases.map((db) => (
                        <SelectItem key={db.datname} value={db.datname}>
                          {db.datname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn user" />
                    </SelectTrigger>
                    <SelectContent>
                      {loginUsers.map((u) => (
                        <SelectItem key={u.usename} value={u.usename}>
                          {u.usename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quyền</label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn quyền" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONNECT">CONNECT</SelectItem>
                      <SelectItem value="READ_ONLY">READ ONLY</SelectItem>
                      <SelectItem value="READ_WRITE">READ WRITE</SelectItem>
                      <SelectItem value="OWNER">OWNER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Current Permissions */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quyền hiện tại trên {selectedDb}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {getCurrentPermission().length > 0 ? (
                    getCurrentPermission().map((perm) => (
                      <Badge key={perm} variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        {perm}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      Không có quyền
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleGrant}>
                  <Shield className="h-4 w-4 mr-2" />
                  Grant
                </Button>
                <Button variant="outline" onClick={handleRevoke}>
                  <X className="h-4 w-4 mr-2" />
                  Revoke
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Ma trận quyền</CardTitle>
          <CardDescription>
            Tổng quan quyền của tất cả users trên các databases
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 border">Database</th>
                    {loginUsers.map((u) => (
                      <th key={u.usename} className="text-center p-2 border">
                        {u.usename}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.databases.map((db) => (
                    <tr key={db.datname}>
                      <td className="p-2 border font-medium">{db.datname}</td>
                      {loginUsers.map((u) => {
                        const perms = data.permissions[db.datname]?.[u.usename] || [];
                        return (
                          <td key={u.usename} className="p-2 border text-center">
                            {perms.length > 0 ? (
                              <Badge variant="success" className="bg-green-100 text-green-800">
                                {perms.length}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
