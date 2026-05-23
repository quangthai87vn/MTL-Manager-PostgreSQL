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
import { Plus, Search, MoreVertical, Key, Trash2 } from "lucide-react";

interface PgUser {
  usename: string;
  rolsuper: boolean;
  rolinherit: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolcanlogin: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<PgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePwUser, setChangePwUser] = useState<PgUser | null>(null);
  const [newPassword2, setNewPassword2] = useState("");
  const [deleteUser, setDeleteUser] = useState<PgUser | null>(null);

  const loadUsers = () => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUsers(data.data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword }),
    });

    const data = await res.json();

    if (data.success) {
      toast.success(`Đã tạo user "${newUsername}"`);
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      setCreateOpen(false);
      loadUsers();
    } else {
      toast.error(data.error || "Không thể tạo user");
    }
  };

  const handleChangePassword = async () => {
    if (!changePwUser || !newPassword2.trim()) return;

    if (newPassword2.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    const res = await fetch(`/api/users/${changePwUser.usename}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword2 }),
    });

    const data = await res.json();

    if (data.success) {
      toast.success(`Đã đổi mật khẩu cho "${changePwUser.usename}"`);
      setChangePwUser(null);
      setNewPassword2("");
    } else {
      toast.error(data.error || "Không thể đổi mật khẩu");
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;

    const res = await fetch(`/api/users/${deleteUser.usename}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (data.success) {
      toast.success(`Đã xóa user "${deleteUser.usename}"`);
      setDeleteUser(null);
      loadUsers();
    } else {
      toast.error(data.error || "Không thể xóa user");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.usename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Người dùng PostgreSQL</h1>
          <p className="text-muted-foreground">
            Quản lý users và phân quyền truy cập
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tạo User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo User mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin để tạo PostgreSQL user mới
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Tên User</Label>
                <Input
                  id="username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="my_user"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
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
                placeholder="Tìm kiếm user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">{filteredUsers.length} users</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên User</TableHead>
                  <TableHead>Superuser</TableHead>
                  <TableHead>Create DB</TableHead>
                  <TableHead>Can Login</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.usename}>
                    <TableCell className="font-medium">{u.usename}</TableCell>
                    <TableCell>
                      <Badge variant={u.rolsuper ? "default" : "secondary"}>
                        {u.rolsuper ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.rolcreatedb ? "default" : "secondary"}>
                        {u.rolcreatedb ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.rolcanlogin ? "default" : "secondary"}>
                        {u.rolcanlogin ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
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
                              setChangePwUser(u);
                              setNewPassword2("");
                            }}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Đổi mật khẩu
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setDeleteUser(u);
                                }}
                                className="text-red-600"
                                disabled={u.usename === "postgres"}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa User
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Xóa User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bạn có chắc muốn xóa user "{u.usename}"?
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

      {/* Change Password Dialog */}
      <Dialog open={!!changePwUser} onOpenChange={() => setChangePwUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu mới cho user "{changePwUser?.usename}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newpw">Mật khẩu mới</Label>
              <Input
                id="newpw"
                type="password"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                placeholder="Ít nhất 8 ký tự"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePwUser(null)}>
              Hủy
            </Button>
            <Button onClick={handleChangePassword}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
