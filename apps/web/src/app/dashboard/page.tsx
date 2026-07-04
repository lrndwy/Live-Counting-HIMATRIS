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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Mahasiswa" value={data?.mahasiswa.total ?? "—"} />
        <StatCard
          title="Sudah memilih"
          value={data?.mahasiswa.sudahMemilih ?? "—"}
          hint={`${data?.mahasiswa.turnout ?? 0}% partisipasi`}
        />
        <StatCard title="Suara pending" value={data?.votes.pending ?? "—"} />
        <StatCard title="Suara SAH" value={data?.votes.sah ?? "—"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Persentase per paslon</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.paslon ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nomor" tickFormatter={(v) => `Paslon ${v}`} />
                <YAxis domain={[0, 100]} unit="%" />
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
          <CardHeader>
            <CardTitle className="text-base">Status suara</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={voteStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
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
          <CardHeader>
            <CardTitle className="text-base">
              Antrian pending (cek otomatis)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eligibilityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Partisipasi mahasiswa</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
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
                  innerRadius={50}
                  outerRadius={100}
                  label
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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
