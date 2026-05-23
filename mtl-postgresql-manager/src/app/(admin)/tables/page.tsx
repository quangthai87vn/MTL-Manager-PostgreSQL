"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Database,
  Table2,
  Search,
  ChevronLeft,
  ChevronRight,
  Columns,
  Key,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";

interface TableInfo {
  schema: string;
  name: string;
  owner: string;
  hasIndexes: boolean;
  hasRules: boolean;
  hasTriggers: boolean;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

interface ConstraintInfo {
  name: string;
  type: string;
  columns: string[];
  definition: string;
}

interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  isPrimary: boolean;
}

interface TableData {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  constraints: ConstraintInfo[];
  indexes: IndexInfo[];
}

export default function TablesPage() {
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>("");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [loadingTables, setLoadingTables] = useState(false);
  const [searchTable, setSearchTable] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [page, setPage] = useState(1);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/databases")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const dbs = data.data.map((d: { datname: string }) => d.datname);
          setDatabases(dbs);
          if (dbs.length > 0 && !selectedDb) {
            setSelectedDb(dbs[0]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingDatabases(false));
  }, []);

  useEffect(() => {
    if (selectedDb) {
      setLoadingTables(true);
      setSelectedTable(null);
      setTableData(null);
      fetch(`/api/databases/${selectedDb}/tables`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setTables(data.data);
          } else {
            toast.error(data.error || "Không thể tải danh sách bảng");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error("Lỗi khi tải danh sách bảng");
        })
        .finally(() => setLoadingTables(false));
    }
  }, [selectedDb]);

  useEffect(() => {
    if (selectedDb && selectedTable) {
      setLoadingData(true);
      fetch(`/api/databases/${selectedDb}/tables/${selectedTable}?page=${page}&limit=50`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setTableData(data.data);
          } else {
            toast.error(data.error || "Không thể tải dữ liệu bảng");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error("Lỗi khi tải dữ liệu bảng");
        })
        .finally(() => setLoadingData(false));
    }
  }, [selectedDb, selectedTable, page]);

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchTable.toLowerCase())
  );

  const groupedTables = filteredTables.reduce((acc, table) => {
    const schema = table.schema;
    if (!acc[schema]) acc[schema] = [];
    acc[schema].push(table);
    return acc;
  }, {} as Record<string, TableInfo[]>);

  const formatValue = (value: unknown): string => {
    if (value === null) return "NULL";
    if (value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header with Database Selector */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Tables</h1>
          <p className="text-muted-foreground">
            Xem cấu trúc và dữ liệu trong các bảng
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedDb} onValueChange={setSelectedDb}>
            <SelectTrigger className="w-[200px]">
              <Database className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Chọn database..." />
            </SelectTrigger>
            <SelectContent>
              {loadingDatabases ? (
                <SelectItem value="loading" disabled>
                  Đang tải...
                </SelectItem>
              ) : (
                databases.map((db) => (
                  <SelectItem key={db} value={db}>
                    {db}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex flex-1 gap-0 border rounded-lg overflow-hidden bg-card">
        {/* Left Panel - Tables List */}
        <div
          className={`transition-all duration-300 border-r ${
            leftCollapsed ? "w-[50px]" : "w-[280px]"
          } flex flex-col bg-muted/30`}
        >
          {/* Panel Header */}
          <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
            {!leftCollapsed && (
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                <span className="font-medium text-sm">Tables</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filteredTables.length}
                </Badge>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setLeftCollapsed(!leftCollapsed)}
            >
              {leftCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search */}
          {!leftCollapsed && (
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Tables List */}
          {!leftCollapsed && (
            <ScrollArea className="flex-1">
              <div className="p-1">
                {loadingTables ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Đang tải...
                  </div>
                ) : Object.keys(groupedTables).length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Không có bảng nào
                  </div>
                ) : (
                  Object.entries(groupedTables).map(([schema, schemaTables]) => (
                    <div key={schema}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-1 sticky top-0 z-10">
                        <span>{schema}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] h-4">
                          {schemaTables.length}
                        </Badge>
                      </div>
                      {schemaTables.map((table) => (
                        <button
                          key={table.name}
                          onClick={() => {
                            setSelectedTable(table.name);
                            setPage(1);
                          }}
                          className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted/50 transition-colors ${
                            selectedTable === table.name
                              ? "bg-primary/10 text-primary font-medium"
                              : ""
                          }`}
                        >
                          <Table2 className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{table.name}</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {selectedTable ? (
            <>
              {/* Table Header */}
              <div className="p-4 border-b bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Table2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{selectedTable}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedDb} &bull; {tableData?.total || 0} dòng
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="data" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 border-b bg-background">
                  <TabsList className="h-10">
                    <TabsTrigger value="data" className="gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Dữ liệu
                    </TabsTrigger>
                    <TabsTrigger value="columns" className="gap-1.5">
                      <Columns className="h-3.5 w-3.5" />
                      Cấu trúc
                    </TabsTrigger>
                    <TabsTrigger value="constraints" className="gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      Ràng buộc
                    </TabsTrigger>
                    <TabsTrigger value="indexes" className="gap-1.5">
                      <Hash className="h-3.5 w-3.5" />
                      Indexes
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-auto p-4">
                  {/* DATA TAB */}
                  <TabsContent value="data" className="mt-0 h-full">
                    {loadingData ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                        </div>
                      </div>
                    ) : tableData && tableData.rows.length > 0 ? (
                      <>
                        {/* Data Table */}
                        <div className="border rounded-lg overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-muted">
                              <TableRow>
                                {tableData.columns.map((col) => (
                                  <TableHead
                                    key={col.name}
                                    className="whitespace-nowrap font-medium"
                                  >
                                    <div className="flex items-center gap-1">
                                      {col.isPrimaryKey && (
                                        <Key className="h-3 w-3 text-yellow-600" />
                                      )}
                                      {col.name}
                                    </div>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tableData.rows.map((row, idx) => (
                                <TableRow key={idx}>
                                  {tableData.columns.map((col) => (
                                    <TableCell
                                      key={col.name}
                                      className="whitespace-nowrap max-w-[200px] truncate"
                                      title={formatValue(row[col.name])}
                                    >
                                      {formatValue(row[col.name])}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Hiển thị {(page - 1) * 50 + 1} -{" "}
                            {Math.min(page * 50, tableData.total)} của {tableData.total} dòng
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={page <= 1}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Trước
                            </Button>
                            <span className="text-sm px-2">
                              Trang {page} / {tableData.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage((p) => p + 1)}
                              disabled={page >= tableData.totalPages}
                            >
                              Sau
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        Bảng trống hoặc không có dữ liệu
                      </div>
                    )}
                  </TabsContent>

                  {/* COLUMNS TAB */}
                  <TabsContent value="columns" className="mt-0 h-full">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted">
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Tên cột</TableHead>
                            <TableHead>Kiểu dữ liệu</TableHead>
                            <TableHead>Mặc định</TableHead>
                            <TableHead className="text-center">Nullable</TableHead>
                            <TableHead className="text-center">Primary Key</TableHead>
                            <TableHead className="text-center">Foreign Key</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData?.columns.map((col, idx) => (
                            <TableRow key={col.name}>
                              <TableCell className="text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-1.5">
                                  {col.isPrimaryKey && (
                                    <Key className="h-3.5 w-3.5 text-yellow-600" />
                                  )}
                                  {col.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {col.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {col.default || "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={col.nullable ? "secondary" : "outline"}>
                                  {col.nullable ? "Yes" : "No"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={col.isPrimaryKey ? "default" : "outline"}>
                                  {col.isPrimaryKey ? "PK" : "-"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={col.isForeignKey ? "secondary" : "outline"}>
                                  {col.isForeignKey ? "FK" : "-"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* CONSTRAINTS TAB */}
                  <TabsContent value="constraints" className="mt-0 h-full">
                    {tableData?.constraints && tableData.constraints.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted">
                            <TableRow>
                              <TableHead>Tên ràng buộc</TableHead>
                              <TableHead>Loại</TableHead>
                              <TableHead>Cột</TableHead>
                              <TableHead>Định nghĩa</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableData.constraints.map((constraint) => (
                              <TableRow key={constraint.name}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <Key className="h-3.5 w-3.5 text-primary" />
                                    {constraint.name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      constraint.type === "PRIMARY KEY"
                                        ? "default"
                                        : constraint.type === "FOREIGN KEY"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {constraint.type}
                                  </Badge>
                                </TableCell>
                                <TableCell>{constraint.columns.join(", ")}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {constraint.definition || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        Không có ràng buộc
                      </div>
                    )}
                  </TabsContent>

                  {/* INDEXES TAB */}
                  <TabsContent value="indexes" className="mt-0 h-full">
                    {tableData?.indexes && tableData.indexes.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted">
                            <TableRow>
                              <TableHead>Tên index</TableHead>
                              <TableHead>Cột</TableHead>
                              <TableHead className="text-center">Unique</TableHead>
                              <TableHead className="text-center">Primary</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableData.indexes.map((index) => (
                              <TableRow key={index.name}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                    {index.name}
                                  </div>
                                </TableCell>
                                <TableCell>{index.columns.join(", ")}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={index.unique ? "secondary" : "outline"}>
                                    {index.unique ? "Yes" : "No"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={index.isPrimary ? "default" : "outline"}>
                                    {index.isPrimary ? "PK" : "-"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        Không có index
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Table2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Chọn một bảng để xem chi tiết</p>
                <p className="text-sm mt-1">
                  Click vào bảng trong danh sách bên trái
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
