import {NextRequest, NextResponse} from 'next/server'
const RUST_API_URL = process.env.API_URL


export async function GET(request: NextRequest, {params}:{params: {groupId: string}} ) {
  try {
    const authHeader = request.headers.get("authorization");
		const id = await params.groupId
		console.log(params) 
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const response = await fetch(`${RUST_API_URL}/groups/${id}/messages?limit=50`, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
