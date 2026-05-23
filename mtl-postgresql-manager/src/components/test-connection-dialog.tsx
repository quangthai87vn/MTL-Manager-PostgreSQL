"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Database, Wifi, WifiOff, Copy, Check } from "lucide-react";

interface TestConnectionDialogProps {
  defaultDatabase?: string;
  defaultUsername?: string;
  trigger?: React.ReactNode;
}

interface User {
  usename: string;
}

export function TestConnectionDialog({
  defaultDatabase = "",
  defaultUsername = "",
  trigger,
}: TestConnectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState("mtl-postgresql");
  const [port, setPort] = useState("5432");
  const [username, setUsername] = useState(defaultUsername);
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState(defaultDatabase);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    version?: string;
  } | null>(null);

  const connectionString = `postgresql://${username}:${encodeURIComponent(password)}@${hostname}:${port}/${database}`;

  useEffect(() => {
    if (open) {
      setLoadingUsers(true);
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUsers(data.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false));
    }
  }, [open]);

  const handleTest = async () => {
    if (!username || !password || !database) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setLoading(true);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, port, username, password, database }),
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        toast.success(`Kết nối ${database} thành công!`);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Đã xảy ra lỗi khi kết nối",
      });
      toast.error("Đã xảy ra lỗi khi kết nối");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(connectionString);
      setCopied(true);
      toast.success("Đã copy connection string!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Wifi className="w-4 h-4 mr-2" />
            Test kết nối
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Test kết nối Database
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname</Label>
              <Input
                id="hostname"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="mtl-postgresql"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="5432"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Select value={username} onValueChange={setUsername}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn username..." />
              </SelectTrigger>
              <SelectContent>
                {loadingUsers ? (
                  <SelectItem value="loading" disabled>
                    Đang tải...
                  </SelectItem>
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.usename} value={user.usename}>
                      {user.usename}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="postgres">postgres</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="database">Database</Label>
            <Input
              id="database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="Nhập tên database"
            />
          </div>

          {result && (
            <div
              className={`p-4 rounded-lg space-y-3 ${
                result.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-600" />
                )}
                <span
                  className={`font-medium ${
                    result.success ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {result.success ? "Kết nối thành công" : "Kết nối thất bại"}
                </span>
              </div>

              {result.success ? (
                <>
                  <p className="text-sm text-green-600">
                    {result.message}
                  </p>
                  {result.version && (
                    <p className="text-sm text-green-600">
                      Server: {result.version.split(" ")[0]} {result.version.split(" ")[1]}
                    </p>
                  )}
                  <div className="pt-2 border-t border-green-200">
                    <Label className="text-green-700">Connection String:</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={connectionString}
                        readOnly
                        className="bg-white text-sm font-mono"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopy}
                        className="shrink-0"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-red-600">{result.message}</p>
              )}
            </div>
          )}

          <Button
            onClick={handleTest}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
