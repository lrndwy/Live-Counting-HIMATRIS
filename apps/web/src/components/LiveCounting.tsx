"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { MEDIA_ASSETS, paslonMedia } from "@/lib/media";
import type { LiveCountRow } from "@/lib/types";

const CHART_COLORS = ["#22d3ee", "#fbbf24", "#e879f9", "#34d399", "#60a5fa"];
const TIDAK_SAH_COLOR = "#f87171";
const GOLPUT_COLOR = "#94a3b8";

const ACCENT = [
  { bar: "from-cyan-400 to-sky-500", ring: "ring-cyan-400/40", glow: "shadow-cyan-500/30" },
  { bar: "from-amber-400 to-orange-500", ring: "ring-amber-400/40", glow: "shadow-amber-500/30" },
  { bar: "from-fuchsia-400 to-pink-500", ring: "ring-fuchsia-400/40", glow: "shadow-fuchsia-500/30" },
];

export function LiveCounting() {
  const [rows, setRows] = useState<LiveCountRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [tidakSah, setTidakSah] = useState(0);
  const [golput, setGolput] = useState(0);
  const [chartTotal, setChartTotal] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visiMisi, setVisiMisi] = useState<{
    src: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          rows: LiveCountRow[];
          grandTotal: number;
          tidakSah: number;
          golput: number;
          chartTotal: number;
          updatedAt: string | null;
        };
        if (!active) return;
        setRows(data.rows);
        setGrandTotal(data.grandTotal);
        setTidakSah(data.tidakSah);
        setGolput(data.golput);
        setChartTotal(data.chartTotal);
        setUpdatedAt(data.updatedAt);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!visiMisi) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisiMisi(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visiMisi]);

  const chartData = useMemo(() => {
    const toPercent = (value: number) =>
      chartTotal > 0 ? Math.round((value / chartTotal) * 1000) / 10 : 0;

    const paslonData = rows.map((row) => ({
      name: `Paslon ${row.nomor}`,
      label: `${row.namaKetua} & ${row.namaWakil}`,
      percent: toPercent(row.total),
      color: undefined as string | undefined,
    }));

    const extra: typeof paslonData = [
      {
        name: "Tidak Sah",
        label: "Suara tidak sah (ditolak PANWASLU / NIM tidak terdaftar)",
        percent: toPercent(tidakSah),
        color: TIDAK_SAH_COLOR,
      },
      {
        name: "Golput",
        label: "Belum memilih (tanpa suara ditolak)",
        percent: toPercent(golput),
        color: GOLPUT_COLOR,
      },
    ];

    return [...paslonData, ...extra];
  }, [rows, chartTotal, tidakSah, golput]);

  const leaderId =
    rows.length > 0
      ? [...rows].sort((a, b) => b.total - a.total)[0]?.paslonId
      : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020617] text-white">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={MEDIA_ASSETS.banner}
          alt=""
          fill
          priority
          className="object-cover object-top opacity-35"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/70 via-[#0c1a3a]/85 to-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.18),_transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-3 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6 sm:gap-4">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 shadow-lg backdrop-blur-md sm:gap-3 sm:px-4 sm:py-2">
            <Image src={MEDIA_ASSETS.logoPnc} alt="PNC" width={40} height={40} className="h-7 w-7 object-contain sm:h-9 sm:w-9" />
            <Image src={MEDIA_ASSETS.logoJurusan} alt="JKB" width={40} height={40} className="h-7 w-7 object-contain sm:h-9 sm:w-9" />
            <Image src={MEDIA_ASSETS.logoHimatris} alt="HIMATRIS" width={40} height={40} className="h-7 w-7 object-contain sm:h-9 sm:w-9" />
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
          </div>
        </header>

        <div className="mb-6 px-1 text-center sm:mb-8">
          <p className="text-[10px] font-medium uppercase leading-relaxed tracking-[0.12em] text-sky-300/90 sm:text-sm sm:tracking-[0.25em]">
            Himpunan Mahasiswa Jurusan Komputer dan Bisnis
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-b from-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
              Live Counting
            </span>
          </h1>
          <p className="mt-1 text-xl font-extrabold tracking-wide sm:text-4xl">
            <span className="bg-gradient-to-b from-cyan-200 to-sky-400 bg-clip-text text-transparent">
              HIMATRIS
            </span>
          </p>
          <p className="mt-3 text-xs text-slate-300 sm:text-sm">
            Reorganisasi Periode 2025/2026 → 2026/2027
          </p>
          <p className="mt-2 text-[11px] text-slate-400 sm:text-xs">
            Terakhir diperbarui:{" "}
            {updatedAt
              ? new Date(updatedAt).toLocaleString("id-ID")
              : "Menunggu data..."}
          </p>
        </div>

        {loading ? (
          <p className="text-center text-slate-300">Memuat data...</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-10 text-center text-slate-300 backdrop-blur">
            Belum ada pasangan calon yang dikonfigurasi.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {rows.map((row, index) => {
                const percent =
                  grandTotal > 0
                    ? Math.round((row.total / grandTotal) * 1000) / 10
                    : 0;
                const accent = ACCENT[index % ACCENT.length];
                const media = paslonMedia(row.nomor);
                const photoSrc = row.fotoUrl || media.photo;
                const visiMisiSrc = row.visiMisiUrl || media.visiMisi;
                const isLeader =
                  grandTotal > 0 && row.paslonId === leaderId && row.total > 0;

                return (
                  <article
                    key={row.paslonId}
                    className={`overflow-hidden rounded-2xl border bg-black/50 shadow-2xl backdrop-blur-md sm:rounded-3xl ${
                      isLeader
                        ? `border-cyan-300/50 ring-2 ${accent.ring} ${accent.glow}`
                        : "border-white/10"
                    }`}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                      {photoSrc ? (
                        row.fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoSrc}
                            alt={`Paslon ${row.nomor}`}
                            className="absolute inset-0 h-full w-full object-cover object-top"
                          />
                        ) : (
                          <Image
                            src={photoSrc}
                            alt={`Paslon ${row.nomor}`}
                            fill
                            className="object-cover object-top"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            priority={index < 2}
                          />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          Paslon {row.nomor}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2 sm:left-4 sm:top-4">
                        <span className="rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 px-2.5 py-1 text-[10px] font-black uppercase text-slate-900 sm:px-3 sm:text-xs">
                          Paslon {row.nomor}
                        </span>
                        {isLeader && (
                          <span className="rounded-full bg-cyan-400 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-900 sm:px-3 sm:text-xs">
                            Terdepan
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-200 sm:text-[11px]">
                          Calon Kahim &amp; Wakahim
                        </p>
                        <h2 className="mt-1 text-lg font-bold leading-tight sm:text-2xl">
                          {row.namaKetua}
                        </h2>
                        <p className="text-sm font-medium text-slate-200 sm:text-lg">
                          &amp; {row.namaWakil}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Persentase Suara
                        </p>
                        <p
                          className={`bg-gradient-to-r ${accent.bar} bg-clip-text text-4xl font-black tabular-nums text-transparent sm:text-5xl`}
                        >
                          {percent}%
                        </p>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${accent.bar} transition-all duration-700`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {visiMisiSrc && (
                        <button
                          type="button"
                          onClick={() =>
                            setVisiMisi({
                              src: visiMisiSrc,
                              title: `Paslon ${row.nomor} — Visi & Misi`,
                            })
                          }
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/10 hover:text-white"
                        >
                          Lihat Visi &amp; Misi
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <section className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-md sm:rounded-3xl sm:p-5">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-300 sm:text-sm">
                  Grafik Batang Persentase
                </h3>
                <p className="mb-3 text-[11px] text-slate-400 sm:mb-4 sm:text-xs">
                  Tidak Sah:{" "}
                  <span className="font-semibold text-red-300">
                    {chartTotal > 0
                      ? Math.round((tidakSah / chartTotal) * 1000) / 10
                      : 0}
                    %
                  </span>
                  {" · "}
                  Golput:{" "}
                  <span className="font-semibold text-slate-300">
                    {chartTotal > 0
                      ? Math.round((golput / chartTotal) * 1000) / 10
                      : 0}
                    %
                  </span>
                </p>
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: "#cbd5e1", fontSize: 11 }}
                        domain={[0, 100]}
                        unit="%"
                        width={36}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: 12,
                          color: "#f8fafc",
                        }}
                        formatter={(value) => [`${value}%`, "Persentase"]}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.label ?? ""
                        }
                      />
                      <Bar dataKey="percent" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={
                              entry.color ??
                              CHART_COLORS[index % CHART_COLORS.length]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-md sm:rounded-3xl sm:p-5">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-300 sm:text-sm">
                  Grafik Proporsi Suara
                </h3>
                <p className="mb-3 text-[11px] text-slate-400 sm:mb-4 sm:text-xs">
                  Tidak Sah:{" "}
                  <span className="font-semibold text-red-300">
                    {chartTotal > 0
                      ? Math.round((tidakSah / chartTotal) * 1000) / 10
                      : 0}
                    %
                  </span>
                  {" · "}
                  Golput:{" "}
                  <span className="font-semibold text-slate-300">
                    {chartTotal > 0
                      ? Math.round((golput / chartTotal) * 1000) / 10
                      : 0}
                    %
                  </span>
                </p>
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="percent"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        label={(props) => {
                          const value = Number(
                            (props.payload as { percent?: number })?.percent ?? 0
                          );
                          return `${value}%`;
                        }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={
                              entry.color ??
                              CHART_COLORS[index % CHART_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: 12,
                          color: "#f8fafc",
                        }}
                        formatter={(value) => [`${value}%`, "Persentase"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </>
        )}

        <footer className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-4 opacity-90">
            <Image src={MEDIA_ASSETS.logoPnc} alt="" width={36} height={36} className="h-8 w-8 object-contain" />
            <Image src={MEDIA_ASSETS.logoJurusan} alt="" width={36} height={36} className="h-8 w-8 object-contain" />
            <Image src={MEDIA_ASSETS.logoHimatris} alt="" width={36} height={36} className="h-8 w-8 object-contain" />
          </div>
          <p className="rounded-full border border-sky-400/20 bg-sky-950/40 px-5 py-2 text-xs text-sky-100/90 sm:text-sm">
            Meneguhkan Ikrar, Merajut Kekompakan.{" "}
            <em>Satu Rumah, Satu Tujuan.</em>
          </p>
        </footer>
      </div>

      {visiMisi && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setVisiMisi(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[92dvh] w-full max-w-3xl overflow-hidden rounded-t-2xl border border-white/15 bg-slate-950 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-4">
              <h3 className="min-w-0 truncate text-sm font-semibold text-sky-100 sm:text-base">
                {visiMisi.title}
              </h3>
              <button
                type="button"
                onClick={() => setVisiMisi(null)}
                className="shrink-0 rounded-lg px-3 py-1 text-sm text-slate-300 hover:bg-white/10"
              >
                Tutup
              </button>
            </div>
            <div className="max-h-[calc(92dvh-3.5rem)] overflow-y-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={visiMisi.src} alt={visiMisi.title} className="h-auto w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
