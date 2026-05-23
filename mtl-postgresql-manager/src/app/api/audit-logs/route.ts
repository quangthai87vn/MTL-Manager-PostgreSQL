import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const action = searchParams.get("action") || undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const result = await getAuditLogs({
      page,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.logs,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch audit logs",
    });
  }
}
