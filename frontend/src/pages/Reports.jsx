import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { getActions, getFundamentos, getClassificacoes, getAthletes, getVideos, getPositions, exportCsvUrl } from "@/lib/api";
import { formatTime, pct } from "@/lib/format";
import { Download, Play, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function Reports() {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [funds, setFunds] = useState([]);
  const [classes, setClasses] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [videos, setVideos] = useState([]);
  const [positions, setPositions] = useState([]);
  const [f, setF] = useState({ video: "", athlete: "", fundamento: "", classificacao: "", position: "", phase: "" });

  useEffect(() => {
    Promise.all([getActions(), getFundamentos(), getClassificacoes(), getAthletes(), getVideos(), getPositions()])
      .then(([a, fu, c, at, v, p]) => { setActions(a); setFunds(fu.filter((x)=>x.active!==false)); setClasses(c); setAthletes(at); setVideos(v); setPositions(p.filter((x)=>x.active!==false)); });
  }, []);

  const athleteById = useMemo(() => Object.fromEntries(athletes.map((a) => [a.id, a])), [athletes]);
  const videoById = useMemo(() => Object.fromEntries(videos.map((v) => [v.id, v])), [videos]);

  const filtered = useMemo(() => actions.filter((a) => {
    if (f.video && a.video_id !== f.video) return false;
    if (f.athlete && !(a.athlete_ids || []).includes(f.athlete)) return false;
    if (f.fundamento && a.fundamento_id !== f.fundamento) return false;
    if (f.classificacao && a.classificacao_id !== f.classificacao) return false;
    if (f.position && a.tactical_position !== f.position) return false;
    if (f.phase && a.phase !== f.phase) return false;
    return true;
  }), [actions, f]);

  const fundDist = useMemo(() => funds.map((fd) => ({ name: fd.name, value: filtered.filter((a) => a.fundamento_id === fd.id).length, color: fd.color })).filter((x) => x.value > 0), [filtered, funds]);

  const classBreakdown = useMemo(() => {
    const selFund = f.fundamento ? funds.filter((x) => x.id === f.fundamento) : funds;
    return selFund.map((fd) => {
      const list = filtered.filter((a) => a.fundamento_id === fd.id);
      const row = { name: fd.name };
      classes.filter((c) => c.fundamento_id === fd.id).forEach((c) => { row[c.label] = list.filter((a) => a.classificacao_id === c.id).length; });
      return row;
    }).filter((r) => Object.keys(r).length > 1);
  }, [filtered, funds, classes, f.fundamento]);

  const classKeys = useMemo(() => {
    const selFund = f.fundamento ? funds.filter((x) => x.id === f.fundamento) : funds;
    const keys = new Set();
    selFund.forEach((fd) => classes.filter((c) => c.fundamento_id === fd.id).forEach((c) => keys.add(c.label)));
    return [...keys];
  }, [funds, classes, f.fundamento]);

  const classColorMap = useMemo(() => { const m = {}; classes.forEach((c) => (m[c.label] = c.color)); return m; }, [classes]);

  const Sel = ({ k, placeholder, options, testid }) => (
    <select data-testid={testid} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/60">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );

  const total = filtered.length;

  return (
    <Layout
      title="Análises e Relatórios"
      subtitle="Estatísticas coletivas e individuais com percentuais"
      back="/"
      actions={<a data-testid="reports-export" href={exportCsvUrl(f.video ? { video_id: f.video } : {})} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary/40"><Download size={16} /> Exportar CSV</a>}
    >
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground"><Filter size={15} /> Filtros</div>
        <div className="flex flex-wrap gap-2">
          <Sel k="video" placeholder="Todas as partidas" testid="filter-video" options={videos.map((v) => ({ v: v.id, l: v.title }))} />
          <Sel k="athlete" placeholder="Todos os atletas" testid="filter-athlete" options={athletes.map((a) => ({ v: a.id, l: `${a.number ? a.number + " · " : ""}${a.name}` }))} />
          <Sel k="fundamento" placeholder="Todos os fundamentos" testid="filter-fund" options={funds.map((x) => ({ v: x.id, l: x.name }))} />
          <Sel k="classificacao" placeholder="Toda classificação" testid="filter-class" options={classes.filter((c) => !f.fundamento || c.fundamento_id === f.fundamento).map((c) => ({ v: c.id, l: c.label }))} />
          <Sel k="position" placeholder="Toda posição" testid="filter-pos" options={positions.map((p) => ({ v: p.name, l: p.name }))} />
          <Sel k="phase" placeholder="Toda fase" testid="filter-phase" options={[{ v: "K1", l: "K1" }, { v: "K2", l: "K2" }, { v: "outras", l: "Outras" }]} />
          <button data-testid="clear-filters" onClick={() => setF({ video: "", athlete: "", fundamento: "", classificacao: "", position: "", phase: "" })} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Limpar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[["Ações", total], ["Fundamentos", fundDist.length], ["Atletas", new Set(filtered.flatMap((a) => a.athlete_ids || [])).size], ["Partidas", new Set(filtered.map((a) => a.video_id)).size]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-4"><div className="font-data text-3xl font-bold text-primary">{v}</div><div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div></div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="ava-heading text-lg font-bold mb-3">Distribuição por fundamento</h3>
          {fundDist.length ? (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={fundDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {fundDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie><Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} /><Legend /></PieChart>
            </ResponsiveContainer></div>
          ) : <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sem dados para os filtros.</div>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="ava-heading text-lg font-bold mb-3">Classificação por fundamento</h3>
          {classBreakdown.length ? (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={classBreakdown}><XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} /><YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} cursor={{ fill: "hsl(var(--secondary))" }} />
                {classKeys.map((k) => <Bar key={k} dataKey={k} stackId="a" fill={classColorMap[k] || "#888"} radius={[2, 2, 0, 0]} />)}
              </BarChart>
            </ResponsiveContainer></div>
          ) : <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sem dados para os filtros.</div>}
        </div>
      </div>

      {f.fundamento && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <h3 className="ava-heading text-lg font-bold mb-3">Eficácia — {funds.find((x) => x.id === f.fundamento)?.name}</h3>
          <div className="flex flex-wrap gap-3">
            {classes.filter((c) => c.fundamento_id === f.fundamento).map((c) => {
              const n = filtered.filter((a) => a.classificacao_id === c.id).length;
              return (
                <div key={c.id} className="rounded-xl border border-border px-4 py-3 min-w-[120px]" style={{ borderColor: c.color + "55" }}>
                  <div className="text-xs font-semibold" style={{ color: c.color }}>{c.label}</div>
                  <div className="font-data text-2xl font-bold">{n}</div>
                  <div className="text-xs text-muted-foreground">{pct(n, total)}% do total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between"><h3 className="ava-heading text-lg font-bold">Ocorrências ({total})</h3></div>
        <div className="divide-y divide-border max-h-[480px] overflow-auto scrollbar-thin">
          {filtered.length === 0 ? <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma ocorrência.</div> : filtered.map((a, i) => {
            const fd = funds.find((x) => x.id === a.fundamento_id);
            return (
              <button key={a.id} data-testid={`report-row-${a.id}`} onClick={() => navigate(`/analisar/${a.video_id}?t=${a.timestamp}&action=${a.id}`)} className="w-full flex items-center gap-3 p-3 hover:bg-secondary/40 text-left">
                <span className="font-data text-xs text-muted-foreground w-6">{i + 1}</span>
                <span className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary"><Play size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{(a.athlete_ids || []).map((id) => athleteById[id]?.name).filter(Boolean).join(", ") || "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{videoById[a.video_id]?.title} · {a.tactical_position || "—"} {a.phase ? `· ${a.phase}` : ""}</div>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: (fd?.color || "#888") + "22", color: fd?.color }}>{a.fundamento_name}</span>
                <span className="text-xs font-medium hidden sm:block">{a.classificacao_label}</span>
                <span className="font-data text-xs text-muted-foreground">{formatTime(a.timestamp)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
