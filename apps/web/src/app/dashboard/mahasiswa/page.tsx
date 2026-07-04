"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PanelShell } from "@/components/panel/PanelShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Mahasiswa, MahasiswaStatus } from "@/lib/types";

export default function MahasiswaPage() {
  const [list, setList] = useState<Mahasiswa[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    belumMemilih: 0,
    sudahMemilih: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<MahasiswaStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, pageSize]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (status !== "ALL") params.set("status", status);

    const res = await fetch(`/api/mahasiswa?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error || "Gagal memuat data mahasiswa");
      return;
    }
    const data = (await res.json()) as {
      mahasiswa: Mahasiswa[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
      stats: { total: number; belumMemilih: number; sudahMemilih: number };
    };
    setList(data.mahasiswa);
    setPagination(data.pagination);
    setStats(data.stats);
    setError("");
  }, [page, pageSize, debouncedSearch, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setError("Pilih file Excel terlebih dahulu");
      return;
    }
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/mahasiswa/import", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = (await res.json()) as {
        error?: string;
        inserted?: number;
        updated?: number;
        total?: number;
      };
      if (!res.ok) throw new Error(data.error || "Gagal import");
      setMessage(
        `Import berhasil. Total: ${data.total}, baru: ${data.inserted}, diperbarui: ${data.updated}.`
      );
      input.value = "";
      setPage(1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal import");
    } finally {
      setUploading(false);
    }
  }

  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <PanelShell
      title="Data Mahasiswa"
      description="Master pemilih dengan import Excel dan pagination"
      roles={["admin"]}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Belum memilih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{stats.belumMemilih}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Sudah memilih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{stats.sudahMemilih}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Import Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Header: <strong>NIM</strong>, <strong>NAMA</strong>,{" "}
            <strong>KELAS</strong>, <strong>ANGKATAN</strong>,{" "}
            <strong>PRODI</strong> (.xlsx / .xls / .csv)
          </p>
          <form onSubmit={onUpload} className="flex flex-wrap items-center gap-3">
            <Input
              type="file"
              name="file"
              accept=".xlsx,.xls,.csv"
              className="max-w-md"
            />
            <Button type="submit" disabled={uploading}>
              {uploading ? "Mengunggah..." : "Import"}
            </Button>
          </form>
          {message && (
            <p className="mt-3 text-sm text-emerald-700">{message}</p>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["ALL", "Semua"],
            ["BELUM_MEMILIH", "Belum memilih"],
            ["SUDAH_MEMILIH", "Sudah memilih"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={status === value ? "default" : "outline"}
            onClick={() => setStatus(value)}
          >
            {label}
          </Button>
        ))}
        <Input
          className="min-w-[220px] flex-1"
          placeholder="Cari NIM, nama, kelas, prodi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIM</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Angkatan</TableHead>
                <TableHead>Prodi</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Tidak ada data pada halaman ini.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((m) => (
                  <TableRow key={m.nim}>
                    <TableCell className="font-mono text-xs">{m.nim}</TableCell>
                    <TableCell className="font-medium">{m.nama}</TableCell>
                    <TableCell>{m.kelas || "—"}</TableCell>
                    <TableCell>{m.angkatan || "—"}</TableCell>
                    <TableCell>{m.prodi || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.statusMemilih === "SUDAH_MEMILIH"
                            ? "success"
                            : "warning"
                        }
                      >
                        {m.statusMemilih === "SUDAH_MEMILIH"
                          ? "Sudah memilih"
                          : "Belum memilih"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Menampilkan {from}–{to} dari {pagination.total} mahasiswa
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm tabular-nums">
            Halaman {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
