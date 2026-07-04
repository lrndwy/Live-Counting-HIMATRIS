"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PanelShell } from "@/components/panel/PanelShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Paslon } from "@/lib/types";

export default function PaslonPage() {
  const [list, setList] = useState<Paslon[]>([]);
  const [nomor, setNomor] = useState("");
  const [namaKetua, setNamaKetua] = useState("");
  const [namaWakil, setNamaWakil] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPaslon = useCallback(async () => {
    const res = await fetch("/api/paslon", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { paslon: Paslon[] };
    setList(data.paslon);
  }, []);

  useEffect(() => {
    void loadPaslon();
  }, [loadPaslon]);

  function resetForm() {
    setNomor("");
    setNamaKetua("");
    setNamaWakil("");
    setFotoUrl("");
    setEditingId(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        const res = await fetch(`/api/paslon/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ namaKetua, namaWakil, fotoUrl }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
        setMessage("Paslon diperbarui.");
      } else {
        const res = await fetch("/api/paslon", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomor, namaKetua, namaWakil, fotoUrl }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
        setMessage("Paslon ditambahkan.");
      }
      resetForm();
      await loadPaslon();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  }

  return (
    <PanelShell title="Pasangan Calon" roles={["admin"]}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit Paslon" : "Tambah Paslon"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input
                placeholder="Nomor (01)"
                value={nomor}
                disabled={Boolean(editingId)}
                onChange={(e) => setNomor(e.target.value)}
              />
              <Input
                placeholder="Nama Ketua"
                value={namaKetua}
                onChange={(e) => setNamaKetua(e.target.value)}
              />
              <Input
                placeholder="Nama Wakil"
                value={namaWakil}
                onChange={(e) => setNamaWakil(e.target.value)}
              />
              <Input
                placeholder="URL Foto (opsional)"
                value={fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit">Simpan</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daftar Paslon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {list.map((paslon) => (
              <div
                key={paslon.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-semibold text-primary">
                    Paslon {paslon.nomor}
                  </p>
                  <p className="font-medium">
                    {paslon.namaKetua} &amp; {paslon.namaWakil}
                  </p>
                  <Badge variant={paslon.aktif ? "success" : "secondary"}>
                    {paslon.aktif ? "Aktif" : "Disembunyikan"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(paslon.id);
                      setNomor(paslon.nomor);
                      setNamaKetua(paslon.namaKetua);
                      setNamaWakil(paslon.namaWakil);
                      setFotoUrl(paslon.fotoUrl ?? "");
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await fetch(`/api/paslon/${paslon.id}`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ aktif: !paslon.aktif }),
                      });
                      await loadPaslon();
                    }}
                  >
                    {paslon.aktif ? "Sembunyikan" : "Tampilkan"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      if (!window.confirm(`Hapus Paslon ${paslon.nomor}?`)) return;
                      await fetch(`/api/paslon/${paslon.id}`, {
                        method: "DELETE",
                        credentials: "include",
                      });
                      await loadPaslon();
                    }}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PanelShell>
  );
}
