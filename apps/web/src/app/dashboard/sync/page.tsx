"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PanelShell } from "@/components/panel/PanelShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SyncSettings } from "@/lib/types";

export default function SyncPage() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Form Responses 1");
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/sync", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { settings: SyncSettings };
    setSettings(data.settings);
    setSpreadsheetId(data.settings.spreadsheetId ?? "");
    setSheetName(data.settings.sheetName ?? "Form Responses 1");
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/sync", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId, sheetName }),
      });
      const data = (await res.json()) as {
        settings?: SyncSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setSettings(data.settings ?? null);
      setMessage("Pengaturan disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function runSyncNow() {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        created?: number;
        updated?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Gagal sinkronisasi");
      setMessage(
        `Sinkronisasi selesai. Baru: ${data.created ?? 0}, diperbarui: ${data.updated ?? 0}.`
      );
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal sinkronisasi");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <PanelShell title="Sinkronisasi Spreadsheet" roles={["admin"]}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konfigurasi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="space-y-3">
              <Input
                required
                placeholder="Spreadsheet ID"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
              />
              <Input
                required
                placeholder="Nama Sheet"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={syncing}
                  onClick={runSyncNow}
                >
                  {syncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {message && <p className="text-emerald-700">{message}</p>}
            {error && <p className="text-destructive">{error}</p>}
            <p>
              <span className="text-muted-foreground">Waktu:</span>{" "}
              {settings?.lastSyncAt
                ? new Date(settings.lastSyncAt).toLocaleString("id-ID")
                : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {settings?.lastSyncStatus ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Baru / Diperbarui:</span>{" "}
              {settings?.lastCreated ?? "—"} / {settings?.lastUpdated ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Error:</span>{" "}
              <span className="text-destructive">
                {settings?.lastError || "—"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </PanelShell>
  );
}
