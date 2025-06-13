import { NextRequest, NextResponse } from "next/server";

const RUST_API_URL = process.env.API_URL || "http://localhost:8080";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')
    console.log(query) 
    const response = await fetch(
      `${RUST_API_URL}/users/profile/search/${query}`,
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );
    console.log(response);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to search users" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
