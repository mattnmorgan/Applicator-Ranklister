import { NextRequest, NextResponse } from "next/server";
import { ApiContext } from "@applicator/sdk/context";

async function assertOwner(context: ApiContext, ranklistId: string) {
  const user = await context.user();
  const ranklists = context.recordManager("ranklister", "ranklist");
  const record = await ranklists.readRecord(ranklistId);
  if (!record || record.data.ownerId !== user.id) {
    return null;
  }
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
    const ranks = context.recordManager("ranklister", "rank");
    const result = await ranks.readRecords({
      filters: [{ field: "ranklistId", operator: "=", value: params.ranklistId }],
      limit: 500,
    });
    return NextResponse.json({
      ranks: result.records
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
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const ranks = context.recordManager("ranklister", "rank");
    const table = await ranks.getTable();

    // Determine next order value
    const existing = await ranks.readRecords({
      filters: [{ field: "ranklistId", operator: "=", value: params.ranklistId }],
      limit: 500,
    });
    const maxOrder = existing.records.reduce(
      (max, r) => Math.max(max, (r.data.order as number) ?? 0),
      0
    );

    const record = await ranks.createRecord(table, {
      ranklistId: params.ranklistId,
      name: body.name.trim(),
      bgColor: body.bgColor ?? "#1e3a5f",
      fgColor: body.fgColor ?? "#ffffff",
      helpText: body.helpText?.trim() ?? "",
      order: maxOrder + 1,
    });
    return NextResponse.json(
      { id: record.id, ...record.data, createdAt: record.created_at, updatedAt: record.updated_at },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
