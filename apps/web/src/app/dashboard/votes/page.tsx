"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function VotesPage() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [filter, setFilter] = useState<VoteStatus | "ALL">("PENDING");
  const [eligibilityFilter, setEligibilityFilter] = useState<
    VoteEligibility | "ALL"
  >("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Vote | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
      setError(data.error || "Gagal memuat data");
      return;
    }
    const data = (await res.json()) as { votes: Vote[] };
    setVotes(data.votes);
    setError("");
  }, [filter, eligibilityFilter, search]);

  useEffect(() => {
    void loadVotes();
    const timer = setInterval(() => void loadVotes(), 10000);
    return () => clearInterval(timer);
  }, [loadVotes]);

  async function setStatus(vote: Vote, status: VoteStatus) {
    if (vote.status === status) return;
    if (!vote.canReview && vote.status === "PENDING") {
      setError(
        vote.eligibility === "NIM_TIDAK_TERDAFTAR"
          ? "NIM tidak terdaftar pada data mahasiswa"
          : "Mahasiswa ini sudah memilih"
      );
      return;
    }
    const label = status === "SAH" ? "SAH" : "TIDAK SAH";
    if (!window.confirm(`Ubah status suara ${vote.namaLengkap} menjadi ${label}?`)) {
      return;
    }
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
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PanelShell
      title="Verifikasi Suara"
      description="SAH / TIDAK SAH hanya untuk NIM terdaftar dan belum memilih"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "TIDAK_SAH" ? "TIDAK SAH" : f}
          </Button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {ELIGIBILITY_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={eligibilityFilter === f.value ? "secondary" : "outline"}
            onClick={() => setEligibilityFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <Input
          className="min-w-[220px] flex-1"
          placeholder="Cari nama, NIM, email, kelas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Pemilih</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Pilihan</TableHead>
                <TableHead>Cek otomatis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {votes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Tidak ada data suara untuk filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                votes.map((vote) => (
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
                          {vote.nim} · {vote.programStudi}
                        </p>
                      </button>
                    </TableCell>
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
                        {vote.status === "TIDAK_SAH" ? "TIDAK SAH" : vote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500"
                          disabled={
                            busyId === vote.id ||
                            vote.status === "SAH" ||
                            (vote.status === "PENDING" && !vote.canReview)
                          }
                          onClick={() => setStatus(vote, "SAH")}
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
                          onClick={() => setStatus(vote, "TIDAK_SAH")}
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{selected.namaLengkap}</CardTitle>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Tutup
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">NIM:</span> {selected.nim}</p>
              <p><span className="text-muted-foreground">Prodi:</span> {selected.programStudi}</p>
              <p><span className="text-muted-foreground">Kelas:</span> {selected.kelas}</p>
              <p><span className="text-muted-foreground">Pilihan:</span> {selected.pilihan}</p>
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
                  {selected.status === "TIDAK_SAH" ? "TIDAK SAH" : selected.status}
                </Badge>
              </div>
              <div className="rounded-lg bg-muted p-3">
                {selected.pernyataan || "—"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PanelShell>
  );
}
