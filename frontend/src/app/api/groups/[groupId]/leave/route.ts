import { NextRequest, NextResponse } from "next/server";

const RUST_API_URL = process.env.API_URL || "http://localhost:8080";

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${RUST_API_URL}/groups/${params.groupId}/leave`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to leave group" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error leaving group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
