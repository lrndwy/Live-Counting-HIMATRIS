"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PanelShell } from "@/components/panel/PanelShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsData } from "@/lib/analytics-types";

const COLORS = ["#0ea5e9", "#f59e0b", "#ec4899", "#10b981", "#6366f1"];
const GOLPUT_COLOR = "#94a3b8";
const TIDAK_SAH_COLOR = "#ef4444";

function paslonLabel(row: AnalyticsData["paslon"][number]) {
  return `Paslon ${row.nomor} — ${row.namaKetua} & ${row.namaWakil}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/analytics", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok || !active) return;
      setData((await res.json()) as AnalyticsData);
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const voteStatusData = data
    ? [
        { name: "Pending", value: data.votes.pending },
        { name: "SAH", value: data.votes.sah },
        { name: "Tidak SAH", value: data.votes.tidakSah },
      ]
    : [];

  const eligibilityData = data
    ? [
        { name: "Layak", value: data.pendingEligibility.eligible },
        {
          name: "NIM tidak terdaftar",
          value: data.pendingEligibility.nimTidakTerdaftar,
        },
        {
          name: "Sudah memilih",
          value: data.pendingEligibility.sudahMemilih,
        },
      ]
    : [];

  const overviewData = data
    ? [
        ...data.paslon.map((p) => ({
          name: `Paslon ${p.nomor}`,
          label: paslonLabel(p),
          value: p.total,
          percent: p.percentOfMahasiswa,
          color: undefined as string | undefined,
        })),
        {
          name: "Golput",
          label: "Mahasiswa belum memilih",
          value: data.golput.total,
          percent: data.golput.percent,
          color: GOLPUT_COLOR,
        },
        {
          name: "Tidak SAH",
          label: "Suara tidak sah",
          value: data.votes.tidakSah,
          percent: data.votes.tidakSahPercent,
          color: TIDAK_SAH_COLOR,
        },
      ]
    : [];

  async function handleExportPdf() {
    if (!data) {
      toast.error("Data belum tersedia");
      return;
    }

    setExporting(true);
    try {
      const { exportAnalyticsPdf } = await import("@/lib/export-analytics-pdf");
      exportAnalyticsPdf(data);
      toast.success("Laporan PDF berhasil diunduh");
    } catch {
      toast.error("Gagal mengekspor PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <PanelShell
      title="Analytics"
      description="Ringkasan pemilu dan status verifikasi suara"
    >
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 sm:mb-6">
        <Button
          type="button"
          variant="outline"
          disabled={!data || exporting}
          onClick={() => void handleExportPdf()}
        >
          <FileDown className="h-4 w-4" />
          {exporting ? "Menyiapkan PDF..." : "Export PDF"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Mahasiswa" value={data?.mahasiswa.total ?? "—"} />
        <StatCard
          title="Sudah memilih"
          value={data?.mahasiswa.sudahMemilih ?? "—"}
          hint={`${data?.mahasiswa.turnout ?? 0}% partisipasi`}
        />
        <StatCard
          title="Golput"
          value={data?.golput.total ?? "—"}
          hint={`${data?.golput.percent ?? 0}% dari mahasiswa`}
        />
        <StatCard title="Suara SAH" value={data?.votes.sah ?? "—"} />
        <StatCard title="Suara pending" value={data?.votes.pending ?? "—"} />
        <StatCard
          title="Tidak SAH"
          value={data?.votes.tidakSah ?? "—"}
          hint={`${data?.votes.tidakSahPercent ?? 0}% dari mahasiswa`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">
              Persentase per paslon
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 px-2 sm:h-80 sm:px-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.paslon ?? []}
                margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="nomor"
                  tickFormatter={(v) => `P${v}`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} unit="%" width={36} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Persentase"]}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as
                      | AnalyticsData["paslon"][number]
                      | undefined;
                    return row ? paslonLabel(row) : "";
                  }}
                />
                <Bar dataKey="percent" radius={[6, 6, 0, 0]}>
                  {(data?.paslon ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">
              Total suara per paslon
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 px-2 sm:h-80 sm:px-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.paslon ?? []}
                margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="nomor"
                  tickFormatter={(v) => `P${v}`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} width={36} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [value, "Total suara SAH"]}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as
                      | AnalyticsData["paslon"][number]
                      | undefined;
                    return row ? paslonLabel(row) : "";
                  }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {(data?.paslon ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">Status suara</CardTitle>
          </CardHeader>
          <CardContent className="h-56 px-2 sm:h-80 sm:px-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={voteStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ percent }) =>
                    `${Math.round((percent ?? 0) * 100)}%`
                  }
                >
                  {voteStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">
              Antrian pending (cek otomatis)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 px-1 sm:h-80 sm:px-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={eligibilityData}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">
              Partisipasi mahasiswa
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 px-2 sm:h-80 sm:px-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Sudah memilih",
                      value: data?.mahasiswa.sudahMemilih ?? 0,
                    },
                    {
                      name: "Golput",
                      value: data?.golput.total ?? 0,
                    },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={70}
                  label={({ percent }) =>
                    `${Math.round((percent ?? 0) * 100)}%`
                  }
                >
                  <Cell fill="#10b981" />
                  <Cell fill={GOLPUT_COLOR} />
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    value,
                    name === "Golput" ? "Mahasiswa belum memilih" : name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">
              Ringkasan persentase (paslon, golput, tidak sah)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 px-2 sm:h-80 sm:px-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overviewData}
                margin={{ top: 8, right: 4, left: -12, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  width={36}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const row = item.payload as (typeof overviewData)[number];
                    const unit = row.name === "Golput" ? "mahasiswa" : "suara";
                    return [`${value}% (${row.value} ${unit})`, "Persentase"];
                  }}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as
                      | (typeof overviewData)[number]
                      | undefined;
                    return row?.label ?? "";
                  }}
                />
                <Bar dataKey="percent" radius={[6, 6, 0, 0]}>
                  {overviewData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color ?? COLORS[i % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PanelShell>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="px-3 pb-1 pt-3 sm:px-6 sm:pb-2 sm:pt-6">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        <p className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
        {hint && <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}
