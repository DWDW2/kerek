import {NextRequest, NextResponse} from "next/server"
const API_URL = process.env.API_URL
export async function POST(
  request: NextRequest,
) {
  try {
    const authHeader = request.headers.get("authorization");
		const {code, language, stdin} = await request.json();
		console.log(code, language, stdin) 
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }
		if(!code || !language) {
			return NextResponse.json({error: "Must specify language or code" }, {status: 400})		

		}

	const res = await fetch(`${API_URL}/compiler/compile`,{
		method: "POST",
		headers: {
			Authorization: `Bearer ${authHeader.split(" ")[1]}`,
			"Content-type": "application/json"	
		},
		body: JSON.stringify({code: code, language: language, input: stdin, timeout: 10})
	})
	console.log(res) 
	const data = await res.json()
	return NextResponse.json(data) 
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

