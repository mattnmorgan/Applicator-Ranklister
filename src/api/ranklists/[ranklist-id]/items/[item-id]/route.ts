import { NextRequest, NextResponse } from "next/server";
import { ApiContext } from "@applicator/sdk/context";

async function assertOwner(context: ApiContext, ranklistId: string) {
  const user = await context.user();
  const ranklists = context.recordManager("ranklister", "ranklist");
  const record = await ranklists.readRecord(ranklistId);
  if (!record || record.data.ownerId !== user.id) return null;
  return record;
}

export async function PATCH(
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
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if ("rankId" in body) updates.rankId = body.rankId;
    if (body.order !== undefined) updates.order = body.order;
    const table = await items.getTable();
    const updated = await items.updateRecord(table, params.itemId, updates);
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

export async function DELETE(
  _req: NextRequest,
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
    if (existing.data.hasImage) {
      const imgPath = `images/${params.ranklistId}/${params.itemId}.jpg`;
      try { await context.appFileManager.deleteFile(imgPath); } catch { /* ignore */ }
    }
    await items.deleteRecord(params.itemId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
