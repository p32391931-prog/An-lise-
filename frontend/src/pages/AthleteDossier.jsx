import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { getAthlete, getActions, getFundamentos, getClassificacoes, getVideos, exportCsvUrl } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { User, Play, Download, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

export default function AthleteDossier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [actions, setActions] = useState([]);
  const [fundamentos, setFundamentos] = useState([]);
  const [classes, setClasses] = useState([]);
  const [videos, setVideos] = useState([]);
  const [openFund, setOpenFund] = useState(null);

  useEffect(() => {
    Promise.all([getAthlete(id), getActions({ athlete_id: id }), getFundamentos(), getClassificacoes(), getVideos()])
      .then(([a, ac, f, c, v]) => { setAthlete(a); setActions(ac); setFundamentos(f); setClasses(c); setVideos(v); })
      .catch(() => {});
  }, [id]);

  const videoById = useMemo(() => Object.fromEntries(videos.map((v) => [v.id, v])), [videos]);
  const activeFund = fundamentos.filter((f) => f.active !== false);

  const perFund = useMemo(() => {
    return activeFund.map((f) => {
      const list = actions.filter((a) => a.fundamento_id === f.id);
      const byClass = {};
      list.forEach((a) => (byClass[a.classificacao_label || "—"] = (byClass[a.classificacao_label || "—"] || 0) + 1));
      return { fund: f, total: list.length, byClass, list };
    });
  }, [actions, activeFund]);

  const radarData = perFund.map((p) => ({ fund: p.fund.name, total: p.total }));
  const classColor = (label, fundId) => classes.find((c) => c.label === label && c.fundamento_id === fundId)?.color || "#A1A1AA";

  if (!athlete) return <Layout back="/atletas"><div className="text-muted-foreground">Carregando...</div></Layout>;

  return (
    <Layout
      title={athlete.name}
      subtitle={`${athlete.position_name || "Sem posição"} · Camisa ${athlete.number || "—"} · ${actions.length} ações`}
      back="/atletas"
      actions={<a data-testid="dossier-export" href={exportCsvUrl({ athlete_id: id })} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary/40"><Download size={16} /> Exportar CSV</a>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-xl bg-secondary flex items-center justify-center">
              <User className="text-primary" size={28} />
              {athlete.number && <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground font-data">{athlete.number}</span>}
            </div>
            <div><div className="ava-heading text-xl font-bold">{athlete.name}</div><div className="text-sm text-muted-foreground">{athlete.position_name}</div></div>
          </div>
          {radarData.some((r) => r.total > 0) && (
            <div className="h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="fund" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Radar dataKey="total" stroke="#E50914" fill="#E50914" fillOpacity={0.45} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
          {athlete.notes && <p className="text-sm text-muted-foreground mt-2 border-t border-border pt-3">{athlete.notes}</p>}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="ava-heading text-xl font-bold flex items-center gap-2"><FolderOpen size={20} className="text-primary" /> Fundamentos</h3>
          {perFund.map(({ fund, total, byClass, list }) => (
            <div key={fund.id} data-testid={`dossier-fund-${fund.id}`} className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => setOpenFund(openFund === fund.id ? null : fund.id)} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/40 transition">
                <span className="h-3 w-3 rounded-full" style={{ background: fund.color }} />
                <span className="font-semibold">{fund.name}</span>
                <span className="ml-auto flex items-center gap-2">
                  {Object.entries(byClass).map(([label, n]) => (
                    <span key={label} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: classColor(label, fund.id) + "22", color: classColor(label, fund.id) }}>{label} {n}</span>
                  ))}
                  <span className="font-data text-sm text-muted-foreground">{total}</span>
                </span>
              </button>
              {openFund === fund.id && (
                <div className="border-t border-border divide-y divide-border">
                  {list.length === 0 ? <div className="p-4 text-sm text-muted-foreground">Nenhuma ação deste fundamento.</div> : list.map((a) => (
                    <button key={a.id} data-testid={`dossier-clip-${a.id}`} onClick={() => navigate(`/analisar/${a.video_id}?t=${a.timestamp}&action=${a.id}`)} className="w-full flex items-center gap-3 p-3 hover:bg-secondary/40 text-left">
                      <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary"><Play size={14} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{videoById[a.video_id]?.title || "Partida"}</div>
                        <div className="text-xs text-muted-foreground">{a.tactical_position || "—"} · {a.phase || "—"}</div>
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: classColor(a.classificacao_label, fund.id) + "22", color: classColor(a.classificacao_label, fund.id) }}>{a.classificacao_label}</span>
                      <span className="font-data text-xs text-muted-foreground">{formatTime(a.timestamp)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
