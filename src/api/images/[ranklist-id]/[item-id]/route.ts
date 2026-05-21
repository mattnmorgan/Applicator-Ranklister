import { NextRequest, NextResponse } from "next/server";
import { ApiContext } from "@applicator/sdk/context";

export async function GET(
  _req: NextRequest,
  context: ApiContext,
  params: { ranklistId: string; itemId: string }
) {
  try {
    const imgPath = `images/${params.ranklistId}/${params.itemId}.jpg`;
    const exists = await context.appFileManager.exists(imgPath);
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const buffer = await context.appFileManager.readFile(imgPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
