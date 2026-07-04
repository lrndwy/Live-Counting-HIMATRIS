"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { PanelShell } from "@/components/panel/PanelShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { Vote, VoteEligibility, VoteStatus } from "@/lib/types";

const FILTERS: Array<VoteStatus | "ALL"> = [
  "PENDING",
  "SAH",
  "TIDAK_SAH",
  "ALL",
];

const ELIGIBILITY_FILTERS: Array<{
  value: VoteEligibility | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "Semua cek" },
  { value: "ELIGIBLE", label: "Layak" },
  { value: "NIM_TIDAK_TERDAFTAR", label: "NIM tidak terdaftar" },
  { value: "SUDAH_MEMILIH", label: "Sudah memilih" },
];

type SortKey =
  | "timestamp"
  | "namaLengkap"
  | "nim"
  | "kelas"
  | "pilihan"
  | "eligibility"
  | "status";

function eligibilityVariant(e: VoteEligibility) {
  if (e === "ELIGIBLE") return "info" as const;
  if (e === "SUDAH_MEMILIH") return "warning" as const;
  return "destructive" as const;
}

function eligibilityLabel(e: VoteEligibility) {
  if (e === "ELIGIBLE") return "Layak diverifikasi";
  if (e === "SUDAH_MEMILIH") return "Sudah memilih";
  return "NIM tidak terdaftar";
}

function statusLabel(status: VoteStatus) {
  return status === "TIDAK_SAH" ? "TIDAK SAH" : status;
}

function sortValue(vote: Vote, key: SortKey): string {
  switch (key) {
    case "timestamp":
      return vote.timestamp;
    case "namaLengkap":
      return vote.namaLengkap.toLowerCase();
    case "nim":
      return vote.nim;
    case "kelas":
      return vote.kelas.toLowerCase();
    case "pilihan":
      return vote.pilihan.toLowerCase();
    case "eligibility":
      return vote.eligibility;
    case "status":
      return vote.status;
  }
}

function SortableHead({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === column;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 font-medium hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
}

export default function VotesPage() {
  const { isAdmin } = useAuth();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [filter, setFilter] = useState<VoteStatus | "ALL">("PENDING");
  const [eligibilityFilter, setEligibilityFilter] = useState<
    VoteEligibility | "ALL"
  >("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Vote | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    vote: Vote;
    status: VoteStatus;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const loadVotes = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", filter);
    if (eligibilityFilter !== "ALL") params.set("eligibility", eligibilityFilter);
    if (search.trim()) params.set("q", search.trim());

    const res = await fetch(`/api/votes?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error || "Gagal memuat data");
      return;
    }
    const data = (await res.json()) as { votes: Vote[] };
    setVotes(data.votes);
  }, [filter, eligibilityFilter, search]);

  useEffect(() => {
    void loadVotes();
    const timer = setInterval(() => void loadVotes(), 10000);
    return () => clearInterval(timer);
  }, [loadVotes]);

  const sortedVotes = useMemo(() => {
    const rows = [...votes];
    rows.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [votes, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "timestamp" ? "desc" : "asc");
    }
  }

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      toast.error("Pilih file Excel terlebih dahulu");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/votes/import", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = (await res.json()) as {
        error?: string;
        created?: number;
        updated?: number;
        total?: number;
      };
      if (!res.ok) throw new Error(data.error || "Gagal import");
      toast.success(
        `Import berhasil. Total: ${data.total}, baru: ${data.created}, diperbarui: ${data.updated}.`
      );
      input.value = "";
      await loadVotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal import");
    } finally {
      setUploading(false);
    }
  }

  function requestStatus(vote: Vote, status: VoteStatus) {
    if (vote.status === status) return;
    if (!vote.canReview && vote.status === "PENDING") {
      toast.error(
        vote.eligibility === "NIM_TIDAK_TERDAFTAR"
          ? "NIM tidak terdaftar pada data mahasiswa"
          : "Mahasiswa ini sudah memilih"
      );
      return;
    }
    setStatusTarget({ vote, status });
  }

  async function confirmStatus() {
    if (!statusTarget) return;
    const { vote, status } = statusTarget;
    setBusyId(vote.id);
    try {
      const res = await fetch(`/api/votes/${vote.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Gagal mengubah status");
      }
      const data = (await res.json()) as { vote: Vote };
      setVotes((prev) => prev.map((v) => (v.id === vote.id ? data.vote : v)));
      if (selected?.id === vote.id) setSelected(data.vote);
      if (filter !== "ALL" && filter !== status) {
        setVotes((prev) => prev.filter((v) => v.id !== vote.id));
      }
      toast.success(
        `Status ${vote.namaLengkap} diubah menjadi ${statusLabel(status)}`
      );
      setStatusTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PanelShell
      title="Verifikasi Suara"
      description="Import file suara, lalu SAH / TIDAK SAH untuk NIM terdaftar dan belum memilih"
    >
      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Import Suara</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Kolom: <strong>Timestamp</strong>, <strong>Nama Lengkap</strong>,{" "}
              <strong>NIM / NPM</strong>, <strong>Program Studi</strong>,{" "}
              <strong>Kelas</strong>,{" "}
              <strong>Silakan Pilih Salah Satu Pasang Calon</strong>,{" "}
              <strong>Pernyataan Pribadi</strong> (.xlsx / .xls / .csv)
            </p>
            <form
              onSubmit={onUpload}
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <Input
                type="file"
                name="file"
                accept=".xlsx,.xls,.csv"
                className="w-full max-w-md"
              />
              <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
                {uploading ? "Mengunggah..." : "Import"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="text-xs sm:text-sm"
          >
            {f === "TIDAK_SAH" ? "TIDAK SAH" : f}
          </Button>
        ))}
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-2">
          {ELIGIBILITY_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={eligibilityFilter === f.value ? "secondary" : "outline"}
              onClick={() => setEligibilityFilter(f.value)}
              className="text-xs sm:text-sm"
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Input
          className="w-full min-w-0 flex-1 sm:min-w-[220px]"
          placeholder="Cari nama, NIM, email, kelas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[52rem]">
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Waktu"
                  column="timestamp"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableHead
                  label="Pemilih"
                  column="namaLengkap"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableHead
                  label="NIM"
                  column="nim"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableHead
                  label="Kelas"
                  column="kelas"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableHead
                  label="Pilihan"
                  column="pilihan"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableHead
                  label="Cek otomatis"
                  column="eligibility"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableHead
                  label="Status"
                  column="status"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVotes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Tidak ada data suara untuk filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                sortedVotes.map((vote) => (
                  <TableRow key={vote.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {vote.timestamp}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setSelected(vote)}
                      >
                        <p className="font-medium">{vote.namaLengkap}</p>
                        <p className="text-xs text-muted-foreground">
                          {vote.programStudi}
                        </p>
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{vote.nim}</TableCell>
                    <TableCell>{vote.kelas}</TableCell>
                    <TableCell>{vote.pilihan}</TableCell>
                    <TableCell>
                      <Badge variant={eligibilityVariant(vote.eligibility)}>
                        {eligibilityLabel(vote.eligibility)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          vote.status === "SAH"
                            ? "success"
                            : vote.status === "TIDAK_SAH"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {statusLabel(vote.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[9.5rem] flex-col gap-1.5 sm:min-w-0 sm:flex-row sm:flex-wrap sm:gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500"
                          disabled={
                            busyId === vote.id ||
                            vote.status === "SAH" ||
                            (vote.status === "PENDING" && !vote.canReview)
                          }
                          onClick={() => requestStatus(vote, "SAH")}
                        >
                          SAH
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={
                            busyId === vote.id ||
                            vote.status === "TIDAK_SAH" ||
                            (vote.status === "PENDING" && !vote.canReview)
                          }
                          onClick={() => requestStatus(vote, "TIDAK_SAH")}
                        >
                          TIDAK SAH
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

      <Dialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ubah status menjadi{" "}
              {statusTarget ? statusLabel(statusTarget.status) : ""}
            </DialogTitle>
            <DialogDescription>
              Konfirmasi perubahan status suara{" "}
              <strong>{statusTarget?.vote.namaLengkap}</strong> (NIM{" "}
              {statusTarget?.vote.nim}) menjadi{" "}
              <strong>
                {statusTarget ? statusLabel(statusTarget.status) : ""}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>
              Batal
            </Button>
            <Button
              variant={
                statusTarget?.status === "TIDAK_SAH" ? "destructive" : "default"
              }
              className={
                statusTarget?.status === "SAH"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : undefined
              }
              disabled={busyId === statusTarget?.vote.id}
              onClick={() => void confirmStatus()}
            >
              {busyId === statusTarget?.vote.id
                ? "Menyimpan..."
                : `Ya, ${statusTarget ? statusLabel(statusTarget.status) : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.namaLengkap}</DialogTitle>
            <DialogDescription>
              Detail suara dan pernyataan pribadi.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Waktu:</span>{" "}
                {selected.timestamp}
              </p>
              <p>
                <span className="text-muted-foreground">NIM:</span> {selected.nim}
              </p>
              <p>
                <span className="text-muted-foreground">Prodi:</span>{" "}
                {selected.programStudi}
              </p>
              <p>
                <span className="text-muted-foreground">Kelas:</span>{" "}
                {selected.kelas}
              </p>
              <p>
                <span className="text-muted-foreground">Pilihan:</span>{" "}
                {selected.pilihan}
              </p>
              <div className="flex gap-2">
                <Badge variant={eligibilityVariant(selected.eligibility)}>
                  {eligibilityLabel(selected.eligibility)}
                </Badge>
                <Badge
                  variant={
                    selected.status === "SAH"
                      ? "success"
                      : selected.status === "TIDAK_SAH"
                        ? "destructive"
                        : "warning"
                  }
                >
                  {statusLabel(selected.status)}
                </Badge>
              </div>
              <div className="rounded-lg bg-muted p-3">
                {selected.pernyataan || "—"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
