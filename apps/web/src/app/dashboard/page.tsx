"use client";

import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Analytics = {
  mahasiswa: {
    total: number;
    belumMemilih: number;
    sudahMemilih: number;
    turnout: number;
  };
  votes: { total: number; pending: number; sah: number; tidakSah: number };
  paslon: Array<{
    paslonId: string;
    nomor: string;
    namaKetua: string;
    namaWakil: string;
    total: number;
    percent: number;
  }>;
  pendingEligibility: {
    eligible: number;
    nimTidakTerdaftar: number;
    sudahMemilih: number;
  };
};

const COLORS = ["#0ea5e9", "#f59e0b", "#ec4899", "#10b981", "#6366f1"];

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/analytics", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok || !active) return;
      setData((await res.json()) as Analytics);
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

  return (
    <PanelShell
      title="Analytics"
      description="Ringkasan pemilu dan status verifikasi suara"
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title="Mahasiswa" value={data?.mahasiswa.total ?? "—"} />
        <StatCard
          title="Sudah memilih"
          value={data?.mahasiswa.sudahMemilih ?? "—"}
          hint={`${data?.mahasiswa.turnout ?? 0}% partisipasi`}
        />
        <StatCard title="Suara pending" value={data?.votes.pending ?? "—"} />
        <StatCard title="Suara SAH" value={data?.votes.sah ?? "—"} />
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
                      | Analytics["paslon"][number]
                      | undefined;
                    return row
                      ? `Paslon ${row.nomor} — ${row.namaKetua} & ${row.namaWakil}`
                      : "";
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
                      name: "Belum memilih",
                      value: data?.mahasiswa.belumMemilih ?? 0,
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
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
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
