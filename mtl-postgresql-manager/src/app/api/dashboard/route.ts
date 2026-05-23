import { NextResponse } from "next/server";
import { checkConnection, getConnectionStats } from "@/lib/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connected = await checkConnection();

    if (!connected) {
      return NextResponse.json({
        success: false,
        data: {
          connected: false,
          version: "N/A",
          databases: 0,
          users: 0,
          size: "0 B",
          latestBackups: [],
        },
      });
    }

    const stats = await getConnectionStats();

    // Get latest backups from backup logs
    const { prisma } = await import("@/lib/prisma");
    const latestBackups = await prisma.backupLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        filename: true,
        databaseName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        ...stats,
        latestBackups,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch dashboard stats",
    });
  }
}
