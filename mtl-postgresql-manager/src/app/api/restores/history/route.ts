import { NextResponse } from "next/server";
import { getRestoreLogs } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await getRestoreLogs({ page, limit });

    return NextResponse.json({
      success: true,
      data: result.logs,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("Get restore logs error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch restore logs",
    });
  }
}
