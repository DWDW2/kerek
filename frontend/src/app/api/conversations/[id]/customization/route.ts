import { NextRequest, NextResponse } from "next/server";

const RUST_API_URL = process.env.API_URL || "http://localhost:8080";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const contentType = request.headers.get("content-type");

    let body: any;
    let headers: Record<string, string> = {
      Authorization: authHeader,
    };

    if (contentType?.includes("multipart/form-data")) {
      body = await request.formData();
    } else {
      body = JSON.stringify(await request.json());
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(
      `${RUST_API_URL}/conversations/${
        (await params.id) as string
      }/customization`,
      {
        method: "POST",
        headers,
        body,
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to update conversation customization" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating conversation customization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
