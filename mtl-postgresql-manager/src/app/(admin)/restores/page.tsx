"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Upload,
  Search,
  Clock,
  Database,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface RestoreHistory {
  id: string;
  filename: string;
  sourceDatabase: string;
  targetDatabase: string;
  mode: string;
  status: string;
  createdAt: string;
  username: string;
}

interface BackupFile {
  filename: string;
}

interface DatabaseInfo {
  datname: string;
}

export default function RestoresPage() {
  const [history, setHistory] = useState<RestoreHistory[]>([]);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(() => {
    Promise.all([
      fetch("/api/restores/history").then((res) => res.json()),
      fetch("/api/backups").then((res) => res.json()),
      fetch("/api/databases").then((res) => res.json()),
    ])
      .then(([historyData, backupData, dbData]) => {
        if (historyData.success) {
          setHistory(historyData.data || []);
        }
        if (backupData.success) {
          setBackupFiles(backupData.data.files || []);
        }
        if (dbData.success) {
          setDatabases(dbData.data || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetDatabase", "upload");
    formData.append("mode", "NEW_DB");

    const res = await fetch("/api/restores", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (result.success) {
      toast.success(`Đã upload "${file.name}"`);
      loadData();
    } else {
      toast.error(result.error || "Không thể upload file");
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRestore = async (
    filename: string,
    targetDb: string,
    mode: "NEW_DB" | "OVERWRITE"
  ) => {
    if (!targetDb) {
      toast.error("Vui lòng chọn database");
      return;
    }

    // Show loading toast
    const toastId = toast.loading(`Đang restore "${filename}" vào "${targetDb}"...`);

    const formData = new FormData();
    formData.append("sourceFile", filename);
    formData.append("targetDatabase", targetDb);
    formData.append("mode", mode);

    try {
      const res = await fetch("/api/restores", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Đã restore "${filename}" vào "${targetDb}" thành công!`, { id: toastId });
        loadData();
      } else {
        toast.error(`Restore thất bại: ${result.error}`, { id: toastId });
      }
    } catch (error) {
      toast.error(`Lỗi kết nối: ${error}`, { id: toastId });
    }
  };

  const filteredHistory = history.filter(
    (h) =>
      h.filename.toLowerCase().includes(search.toLowerCase()) ||
      h.targetDatabase.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Phục hồi</h1>
        <p className="text-muted-foreground">
          Upload và restore các bản sao lưu database
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Backup
          </CardTitle>
          <CardDescription>
            Upload file backup (.dump, .sql, .backup) để restore
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".dump,.sql,.backup"
              onChange={handleUpload}
              disabled={uploading}
              className="max-w-sm"
            />
            {uploading && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang upload...
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Backups */}
      <Card>
        <CardHeader>
          <CardTitle>File backup có sẵn</CardTitle>
          <CardDescription>
            Chọn file để restore vào database mới hoặc database hiện có
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : backupFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không có file backup
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên file</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backupFiles.map((file) => (
                  <TableRow key={file.filename}>
                    <TableCell className="font-medium">
                      {file.filename}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <RestoreDialog
                          filename={file.filename}
                          databases={databases}
                          onRestore={handleRestore}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Restore History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Lịch sử phục hồi
              </CardTitle>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có lịch sử phục hồi
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Database đích</TableHead>
                  <TableHead>Chế độ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Ngày</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.filename}</TableCell>
                    <TableCell>{h.targetDatabase}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{h.mode}</Badge>
                    </TableCell>
                    <TableCell>
                      {h.status === "SUCCESS" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : h.status === "FAILED" ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{h.username}</TableCell>
                    <TableCell>{formatDate(h.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RestoreDialog({
  filename,
  databases,
  onRestore,
}: {
  filename: string;
  databases: { datname: string }[];
  onRestore: (
    filename: string,
    targetDb: string,
    mode: "NEW_DB" | "OVERWRITE"
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [targetDb, setTargetDb] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    if (!targetDb) return;
    
    setIsRestoring(true);
    setOpen(false);
    
    await onRestore(filename, targetDb, "OVERWRITE");
    
    setIsRestoring(false);
    setTargetDb("");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Database className="h-4 w-4 mr-1" />
          Restore
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore Database</AlertDialogTitle>
          <AlertDialogDescription>
            Restore file "{filename}" vào database
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Dữ liệu hiện tại của database sẽ bị xóa!
            </span>
          </div>
          <div className="space-y-2">
            <Label>Chọn database đích</Label>
            <Select value={targetDb} onValueChange={setTargetDb}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn database..." />
              </SelectTrigger>
              <SelectContent>
                {databases.map((db) => (
                  <SelectItem key={db.datname} value={db.datname}>
                    {db.datname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setTargetDb("")}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRestore}
            disabled={isRestoring || !targetDb}
            className="bg-red-600 hover:bg-red-700"
          >
            {isRestoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isRestoring ? "Đang restore..." : "Restore"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
