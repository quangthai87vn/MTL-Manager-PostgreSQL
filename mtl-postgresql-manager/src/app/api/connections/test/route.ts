import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { testConnection } from "@/lib/postgres";

export async function POST(request: Request) {
  try {
    await getCurrentUser();
    const { hostname, port, username, password, database } = await request.json();

    if (!username || !password || !database) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ username, password và database" },
        { status: 400 }
      );
    }

    const result = await testConnection(hostname, port, username, password, database);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test connection error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to test connection" },
      { status: 500 }
    );
  }
}
