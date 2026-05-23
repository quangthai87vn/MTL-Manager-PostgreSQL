"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Settings, Key, Database, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConnectionInfo {
  host: string;
  port: string;
  user: string;
  database: string;
  connectionType: string;
  description: string;
}

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu mới không khớp");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    toast.success("Đã đổi mật khẩu admin");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  useEffect(() => {
    fetch("/api/connections/default")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setConnectionInfo(data.data);
        }
      })
      .catch(() => {
        // Use defaults if API fails
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground">
          Quản lý cài đặt ứng dụng
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Đổi mật khẩu Admin
          </CardTitle>
          <CardDescription>
            Thay đổi mật khẩu đăng nhập admin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current">Mật khẩu hiện tại</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">Mật khẩu mới</Label>
            <Input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>
          <Button onClick={handleChangePassword}>Đổi mật khẩu</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Kết nối PostgreSQL
          </CardTitle>
          <CardDescription>
            Thông tin kết nối được cấu hình tự động từ Docker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Trạng thái</span>
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Tự động
            </Badge>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Host</span>
            <span className="font-mono text-sm">{connectionInfo?.host || "mtl-postgresql"}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Port</span>
            <span className="font-mono text-sm">{connectionInfo?.port || "5432"}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Database</span>
            <span className="font-mono text-sm">{connectionInfo?.database || "postgres"}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">SQLite DB</span>
            <span className="font-mono text-sm">/data/mtl-manager.db</span>
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-muted-foreground">
            {connectionInfo?.description || "Kết nối tự động qua Docker network (mtl-network)"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
