"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PanelShell } from "@/components/panel/PanelShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Paslon } from "@/lib/types";

export default function PaslonPage() {
  const [list, setList] = useState<Paslon[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Paslon | null>(null);
  const [editing, setEditing] = useState<Paslon | null>(null);
  const [nomor, setNomor] = useState("");
  const [namaKetua, setNamaKetua] = useState("");
  const [namaWakil, setNamaWakil] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [visiMisiFile, setVisiMisiFile] = useState<File | null>(null);
  const [visiMisiPreview, setVisiMisiPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPaslon = useCallback(async () => {
    const res = await fetch("/api/paslon", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { paslon: Paslon[] };
    setList(data.paslon);
  }, []);

  useEffect(() => {
    void loadPaslon();
  }, [loadPaslon]);

  useEffect(() => {
    if (!fotoFile) {
      setFotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(fotoFile);
    setFotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoFile]);

  useEffect(() => {
    if (!visiMisiFile) {
      setVisiMisiPreview(null);
      return;
    }
    const url = URL.createObjectURL(visiMisiFile);
    setVisiMisiPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [visiMisiFile]);

  function openCreate() {
    setEditing(null);
    setNomor("");
    setNamaKetua("");
    setNamaWakil("");
    setFotoFile(null);
    setVisiMisiFile(null);
    setFormOpen(true);
  }

  function openEdit(paslon: Paslon) {
    setEditing(paslon);
    setNomor(paslon.nomor);
    setNamaKetua(paslon.namaKetua);
    setNamaWakil(paslon.namaWakil);
    setFotoFile(null);
    setVisiMisiFile(null);
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = new FormData();
      body.set("namaKetua", namaKetua);
      body.set("namaWakil", namaWakil);
      if (fotoFile) body.set("foto", fotoFile);
      if (visiMisiFile) body.set("visiMisi", visiMisiFile);

      let res: Response;
      if (editing) {
        res = await fetch(`/api/paslon/${editing.id}`, {
          method: "PATCH",
          credentials: "include",
          body,
        });
      } else {
        body.set("nomor", nomor);
        res = await fetch("/api/paslon", {
          method: "POST",
          credentials: "include",
          body,
        });
      }

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

      toast.success(editing ? "Paslon diperbarui" : "Paslon ditambahkan");
      setFormOpen(false);
      await loadPaslon();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAktif(paslon: Paslon) {
    setBusyId(paslon.id);
    try {
      const res = await fetch(`/api/paslon/${paslon.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !paslon.aktif }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status");
      toast.success(
        paslon.aktif ? "Paslon disembunyikan" : "Paslon ditampilkan"
      );
      await loadPaslon();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/paslon/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Gagal menghapus");
      }
      toast.success(`Paslon ${deleteTarget.nomor} dihapus`);
      setDeleteTarget(null);
      await loadPaslon();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  const currentFoto = fotoPreview || editing?.fotoUrl || null;
  const currentVisiMisi = visiMisiPreview || editing?.visiMisiUrl || null;

  return (
    <PanelShell title="Pasangan Calon" roles={["admin"]}>
      <div className="mb-4 flex justify-stretch sm:justify-end">
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Tambah Paslon
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[48rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Visi &amp; Misi</TableHead>
                <TableHead>Nomor</TableHead>
                <TableHead>Ketua</TableHead>
                <TableHead>Wakil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Belum ada pasangan calon.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((paslon) => (
                  <TableRow key={paslon.id}>
                    <TableCell>
                      {paslon.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={paslon.fotoUrl}
                          alt={`Paslon ${paslon.nomor}`}
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {paslon.visiMisiUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={paslon.visiMisiUrl}
                          alt={`Visi misi paslon ${paslon.nomor}`}
                          className="h-12 w-20 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {paslon.nomor}
                    </TableCell>
                    <TableCell className="font-medium">
                      {paslon.namaKetua}
                    </TableCell>
                    <TableCell>{paslon.namaWakil}</TableCell>
                    <TableCell>
                      <Badge variant={paslon.aktif ? "success" : "secondary"}>
                        {paslon.aktif ? "Aktif" : "Disembunyikan"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[10rem] flex-col gap-1.5 sm:min-w-0 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(paslon)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === paslon.id}
                          onClick={() => void toggleAktif(paslon)}
                        >
                          {paslon.aktif ? "Sembunyikan" : "Tampilkan"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(paslon)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Paslon" : "Tambah Paslon"}
            </DialogTitle>
            <DialogDescription>
              Isi data pasangan calon. Foto dan visi misi opsional (JPG/PNG/WEBP,
              maks. 5 MB).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomor">Nomor</Label>
              <Input
                id="nomor"
                placeholder="01"
                value={nomor}
                disabled={Boolean(editing)}
                required
                onChange={(e) => setNomor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="namaKetua">Nama Ketua</Label>
              <Input
                id="namaKetua"
                value={namaKetua}
                required
                onChange={(e) => setNamaKetua(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="namaWakil">Nama Wakil</Label>
              <Input
                id="namaWakil"
                value={namaWakil}
                required
                onChange={(e) => setNamaWakil(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foto">Foto Paslon</Label>
              <Input
                id="foto"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
              />
              {currentFoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentFoto}
                  alt="Preview foto"
                  className="mt-2 h-28 w-28 rounded-md object-cover"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="visiMisi">Visi &amp; Misi (gambar)</Label>
              <Input
                id="visiMisi"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setVisiMisiFile(e.target.files?.[0] ?? null)}
              />
              {currentVisiMisi && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentVisiMisi}
                  alt="Preview visi misi"
                  className="mt-2 max-h-40 w-full rounded-md object-contain bg-muted"
                />
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Paslon</DialogTitle>
            <DialogDescription>
              Hapus Paslon {deleteTarget?.nomor} (
              {deleteTarget?.namaKetua} &amp; {deleteTarget?.namaWakil})? Tindakan
              ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
