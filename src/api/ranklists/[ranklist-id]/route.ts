import { NextRequest, NextResponse } from "next/server";
import { ApiContext } from "@applicator/sdk/context";

export async function GET(
  _req: NextRequest,
  context: ApiContext,
  params: { ranklistId: string }
) {
  try {
    const user = await context.user();
    const ranklists = context.recordManager("ranklister", "ranklist");
    const record = await ranklists.readRecord(params.ranklistId);
    if (!record || record.data.ownerId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: record.id,
      ...record.data,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: ApiContext,
  params: { ranklistId: string }
) {
  try {
    const user = await context.user();
    const ranklists = context.recordManager("ranklister", "ranklist");
    const existing = await ranklists.readRecord(params.ranklistId);
    if (!existing || existing.data.ownerId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    const table = await ranklists.getTable();
    const updated = await ranklists.updateRecord(table, params.ranklistId, updates);
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
  params: { ranklistId: string }
) {
  try {
    const user = await context.user();
    const ranklists = context.recordManager("ranklister", "ranklist");
    const existing = await ranklists.readRecord(params.ranklistId);
    if (!existing || existing.data.ownerId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete all items and their images
    const items = context.recordManager("ranklister", "item");
    const itemResult = await items.readRecords({
      filters: [{ field: "ranklistId", operator: "=", value: params.ranklistId }],
      limit: 10000,
    });
    for (const item of itemResult.records) {
      if (item.data.hasImage) {
        const imgPath = `images/${params.ranklistId}/${item.id}.jpg`;
        try { await context.appFileManager.deleteFile(imgPath); } catch { /* ignore */ }
      }
      await items.deleteRecord(item.id);
    }

    // Delete all ranks
    const ranks = context.recordManager("ranklister", "rank");
    const rankResult = await ranks.readRecords({
      filters: [{ field: "ranklistId", operator: "=", value: params.ranklistId }],
      limit: 10000,
    });
    for (const rank of rankResult.records) {
      await ranks.deleteRecord(rank.id);
    }

    // Delete the ranklist
    await ranklists.deleteRecord(params.ranklistId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
