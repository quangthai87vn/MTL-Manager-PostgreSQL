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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Search, MoreVertical, Pencil, Trash2, Wifi } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { TestConnectionDialog } from "@/components/test-connection-dialog";

interface Database {
  datname: string;
  size: string;
  owner: string;
}

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newDbName, setNewDbName] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [renameDb, setRenameDb] = useState<Database | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteDb, setDeleteDb] = useState<Database | null>(null);

  const loadDatabases = () => {
    fetch("/api/databases")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDatabases(data.data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDatabases();
  }, []);

  const handleCreate = async () => {
    if (!newDbName.trim()) {
      toast.error("Vui lòng nhập tên database");
      return;
    }

    const res = await fetch("/api/databases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDbName, owner: newOwner }),
    });

    const data = await res.json();

    if (data.success) {
      toast.success(`Đã tạo database "${newDbName}"`);
      setNewDbName("");
      setNewOwner("");
      setCreateOpen(false);
      loadDatabases();
    } else {
      toast.error(data.error || "Không thể tạo database");
    }
  };

  const handleRename = async () => {
    if (!renameDb || !newName.trim()) return;

    const res = await fetch(`/api/databases/${renameDb.datname}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });

    const data = await res.json();

    if (data.success) {
      toast.success(`Đã đổi tên thành "${newName}"`);
      setRenameDb(null);
      setNewName("");
      loadDatabases();
    } else {
      toast.error(data.error || "Không thể đổi tên");
    }
  };

  const handleDelete = async () => {
    if (!deleteDb) return;

    const res = await fetch(`/api/databases/${deleteDb.datname}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (data.success) {
      toast.success(`Đã xóa database "${deleteDb.datname}"`);
      setDeleteDb(null);
      loadDatabases();
    } else {
      toast.error(data.error || "Không thể xóa database");
    }
  };

  const filteredDatabases = databases.filter((db) =>
    db.datname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cơ sở dữ liệu</h1>
          <p className="text-muted-foreground">
            Quản lý PostgreSQL databases
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tạo Database
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo Database mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin để tạo database mới
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dbname">Tên Database</Label>
                <Input
                  id="dbname"
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  placeholder="my_database"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner">Owner (tùy chọn)</Label>
                <Input
                  id="owner"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="postgres"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreate}>Tạo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm database..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">{filteredDatabases.length} databases</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên Database</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Dung lượng</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDatabases.map((db) => (
                  <TableRow key={db.datname}>
                    <TableCell className="font-medium">{db.datname}</TableCell>
                    <TableCell>{db.owner}</TableCell>
                    <TableCell>{db.size}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameDb(db);
                              setNewName(db.datname);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Đổi tên
                          </DropdownMenuItem>
                          <TestConnectionDialog
                            defaultDatabase={db.datname}
                            defaultUsername={db.owner}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Wifi className="h-4 w-4 mr-2" />
                                Test kết nối
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setDeleteDb(db);
                                }}
                                className="text-red-600"
                                disabled={db.datname === "postgres"}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Xóa Database</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bạn có chắc muốn xóa database "{db.datname}"?
                                  Hành động này không thể hoàn tác.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDelete}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Xóa
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={!!renameDb} onOpenChange={() => setRenameDb(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên Database</DialogTitle>
            <DialogDescription>
              Nhập tên mới cho database "{renameDb?.datname}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newname">Tên mới</Label>
              <Input
                id="newname"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="new_database_name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDb(null)}>
              Hủy
            </Button>
            <Button onClick={handleRename}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
