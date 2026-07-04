import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { mapSyncSettings } from "@/lib/mappers";
import { runSyncWithErrorHandling } from "@/lib/sync-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const result = await query(
    `SELECT spreadsheet_id, sheet_name, last_sync_at, last_sync_status,
            last_error, last_upserted, last_created, last_updated
     FROM settings WHERE key = 'sync'`
  );

  if (result.rowCount === 0) {
    return NextResponse.json({
      settings: {
        spreadsheetId: "",
        sheetName: "Form Responses 1",
        lastSyncAt: null,
        lastSyncStatus: null,
        lastError: null,
      },
    });
  }

  return NextResponse.json({
    settings: mapSyncSettings(
      result.rows[0] as {
        spreadsheet_id: string;
        sheet_name: string;
        last_sync_at: Date | null;
        last_sync_status: string | null;
        last_error: string | null;
        last_upserted: number | null;
        last_created: number | null;
        last_updated: number | null;
      }
    ),
  });
}

export async function PUT(request: Request) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    spreadsheetId?: string;
    sheetName?: string;
  };

  const spreadsheetId = (body.spreadsheetId ?? "").trim();
  const sheetName = (body.sheetName ?? "").trim() || "Form Responses 1";

  await query(
    `INSERT INTO settings (key, spreadsheet_id, sheet_name)
     VALUES ('sync', $1, $2)
     ON CONFLICT (key) DO UPDATE
     SET spreadsheet_id = EXCLUDED.spreadsheet_id,
         sheet_name = EXCLUDED.sheet_name`,
    [spreadsheetId, sheetName]
  );

  return GET();
}

export async function POST() {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  try {
    const result = await runSyncWithErrorHandling();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal sinkronisasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
