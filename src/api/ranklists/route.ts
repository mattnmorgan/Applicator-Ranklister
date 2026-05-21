import { NextRequest, NextResponse } from "next/server";
import { ApiContext } from "@applicator/sdk/context";

export async function GET(_req: NextRequest, context: ApiContext) {
  try {
    const user = await context.user();
    const ranklists = context.recordManager("ranklister", "ranklist");
    const result = await ranklists.readRecords({
      filters: [{ field: "ownerId", operator: "=", value: user.id }],
      limit: 2000,
    });
    return NextResponse.json({
      ranklists: result.records.map((r) => ({
        id: r.id,
        ...r.data,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: ApiContext) {
  try {
    const user = await context.user();
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const ranklists = context.recordManager("ranklister", "ranklist");
    const table = await ranklists.getTable();
    const record = await ranklists.createRecord(table, {
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      ownerId: user.id,
    });
    return NextResponse.json(
      { id: record.id, ...record.data, createdAt: record.created_at, updatedAt: record.updated_at },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
