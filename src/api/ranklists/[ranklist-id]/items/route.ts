import { NextRequest, NextResponse } from "next/server";
import { ApiContext } from "@applicator/sdk/context";
async function assertOwner(context: ApiContext, ranklistId: string) {
  const user = await context.user();
  const ranklists = context.recordManager("ranklister", "ranklist");
  const record = await ranklists.readRecord(ranklistId);
  if (!record || record.data.ownerId !== user.id) return null;
  return record;
}

export async function GET(
  _req: NextRequest,
  context: ApiContext,
  params: { ranklistId: string }
) {
  try {
    if (!await assertOwner(context, params.ranklistId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const items = context.recordManager("ranklister", "item");
    const result = await items.readRecords({
      filters: [{ field: "ranklistId", operator: "=", value: params.ranklistId }],
      limit: 10000,
    });
    return NextResponse.json({
      items: result.records
        .map((r) => ({ id: r.id, ...r.data, createdAt: r.created_at, updatedAt: r.updated_at }))
        .sort((a: any, b: any) => a.order - b.order),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: ApiContext,
  params: { ranklistId: string }
) {
  try {
    if (!await assertOwner(context, params.ranklistId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const formData = await req.formData();
    const name = (formData.get("name") as string)?.trim();
    const imageFile = formData.get("image") as File | null;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!imageFile) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const mimeType = imageFile.type;
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Determine next order in Library (rankId = null)
    const items = context.recordManager("ranklister", "item");
    const allItems = await items.readRecords({
      filters: [{ field: "ranklistId", operator: "=", value: params.ranklistId }],
      limit: 10000,
    });
    const libraryItems = allItems.records.filter((r) => !r.data.rankId);
    const maxOrder = libraryItems.reduce(
      (max, r) => Math.max(max, (r.data.order as number) ?? 0),
      0
    );

    const table = await items.getTable();
    const record = await items.createRecord(table, {
      ranklistId: params.ranklistId,
      rankId: null,
      name,
      order: maxOrder + 1,
      hasImage: false,
    });

    // Save the client-resized image
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await context.appFileManager.writeFile(`images/${params.ranklistId}/${record.id}.jpg`, buffer);

    // Mark hasImage
    const updated = await items.updateRecord(table, record.id, { hasImage: true });

    return NextResponse.json(
      { id: updated.id, ...updated.data, createdAt: updated.created_at, updatedAt: updated.updated_at },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
