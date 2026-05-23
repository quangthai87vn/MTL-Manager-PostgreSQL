import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const connectionInfo = {
    host: process.env.POSTGRES_HOST || "mtl-postgresql",
    port: process.env.POSTGRES_PORT || "5432",
    user: process.env.POSTGRES_USER || "postgres",
    database: process.env.POSTGRES_DB || "postgres",
    connectionType: "auto",
    description: "Kết nối tự động qua Docker network (mtl-network)",
  };

  return NextResponse.json({
    success: true,
    data: connectionInfo,
  });
}
