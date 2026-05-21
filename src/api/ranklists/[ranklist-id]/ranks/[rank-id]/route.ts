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
  params: { ranklistId: string; rankId: string }
) {
  try {
    if (!await assertOwner(context, params.ranklistId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await req.json();
    const ranks = context.recordManager("ranklister", "rank");
    const existing = await ranks.readRecord(params.rankId);
    if (!existing || existing.data.ranklistId !== params.ranklistId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.bgColor !== undefined) updates.bgColor = body.bgColor;
    if (body.fgColor !== undefined) updates.fgColor = body.fgColor;
    if (body.helpText !== undefined) updates.helpText = body.helpText.trim();
    if (body.order !== undefined) updates.order = body.order;
    const table = await ranks.getTable();
    const updated = await ranks.updateRecord(table, params.rankId, updates);
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
  params: { ranklistId: string; rankId: string }
) {
  try {
    if (!await assertOwner(context, params.ranklistId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ranks = context.recordManager("ranklister", "rank");
    const existing = await ranks.readRecord(params.rankId);
    if (!existing || existing.data.ranklistId !== params.ranklistId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Move all items in this rank to Library (rankId = null)
    const items = context.recordManager("ranklister", "item");
    const itemResult = await items.readRecords({
      filters: [{ field: "rankId", operator: "=", value: params.rankId }],
      limit: 10000,
    });
    const itemTable = await items.getTable();

    // Find max order in library lane to append after
    const allItems = await items.readRecords({
      filters: [{ field: "ranklistId", operator: "=", value: params.ranklistId }],
      limit: 10000,
    });
    const libraryItemRecords = allItems.records.filter((r) => !r.data.rankId);
    const baseOrder = libraryItemRecords.reduce(
      (max, r) => Math.max(max, (r.data.order as number) ?? 0),
      0
    );

    for (let i = 0; i < itemResult.records.length; i++) {
      await items.updateRecord(itemTable, itemResult.records[i].id, {
        rankId: null,
        order: baseOrder + i + 1,
      });
    }

    await ranks.deleteRecord(params.rankId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
