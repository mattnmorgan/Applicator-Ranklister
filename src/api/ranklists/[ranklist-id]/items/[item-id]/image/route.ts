import { NextRequest, NextResponse } from "next/server";
import { ApiContext } from "@applicator/sdk/context";
async function assertOwner(context: ApiContext, ranklistId: string) {
  const user = await context.user();
  const ranklists = context.recordManager("ranklister", "ranklist");
  const record = await ranklists.readRecord(ranklistId);
  if (!record || record.data.ownerId !== user.id) return null;
  return record;
}

export async function POST(
  req: NextRequest,
  context: ApiContext,
  params: { ranklistId: string; itemId: string }
) {
  try {
    if (!await assertOwner(context, params.ranklistId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const items = context.recordManager("ranklister", "item");
    const existing = await items.readRecord(params.itemId);
    if (!existing || existing.data.ranklistId !== params.ranklistId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Save the client-resized image
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await context.appFileManager.writeFile(
      `images/${params.ranklistId}/${params.itemId}.jpg`,
      buffer
    );

    const table = await items.getTable();
    const updated = await items.updateRecord(table, params.itemId, { hasImage: true });
    return NextResponse.json({
      id: updated.id,
      ...updated.data,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
