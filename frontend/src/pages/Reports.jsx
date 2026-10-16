import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { getActions, getFundamentos, getClassificacoes, getAthletes, getVideos, getPositions, getFormations, exportCsvUrl } from "@/lib/api";
import { formatTime, pct } from "@/lib/format";
import { CourtMap } from "@/components/CourtMap";
import { Download, Play, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function Reports() {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [funds, setFunds] = useState([]);
  const [classes, setClasses] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [videos, setVideos] = useState([]);
  const [positions, setPositions] = useState([]);
  const [formations, setFormations] = useState([]);
  const [f, setF] = useState({ video: "", athlete: "", fundamento: "", classificacao: "", position: "", phase: "", formation: "" });
  const [heatFund, setHeatFund] = useState("");
  const [recFormation, setRecFormation] = useState("");
  const [selFormation, setSelFormation] = useState("");

  useEffect(() => {
    Promise.all([getActions(), getFundamentos(), getClassificacoes(), getAthletes(), getVideos(), getPositions(), getFormations()])
      .then(([a, fu, c, at, v, p, fo]) => { setActions(a); setFunds(fu.filter((x) => x.active !== false && !x.archived)); setClasses(c); setAthletes(at); setVideos(v); setPositions(p.filter((x) => x.active !== false)); setFormations(fo.filter((x) => x.active !== false)); });
  }, []);

  const athleteById = useMemo(() => Object.fromEntries(athletes.map((a) => [a.id, a])), [athletes]);
  const videoById = useMemo(() => Object.fromEntries(videos.map((v) => [v.id, v])), [videos]);
  const recepFund = useMemo(() => funds.find((x) => x.name === "Recepção"), [funds]);
  const ataqueFund = useMemo(() => funds.find((x) => x.name === "Ataque"), [funds]);

  const filtered = useMemo(() => actions.filter((a) => {
    if (f.video && a.video_id !== f.video) return false;
    if (f.athlete && !(a.athlete_ids || []).includes(f.athlete)) return false;
    if (f.fundamento && a.fundamento_id !== f.fundamento) return false;
    if (f.classificacao && a.classificacao_id !== f.classificacao) return false;
    if (f.position && a.tactical_position !== f.position) return false;
    if (f.phase && a.phase !== f.phase) return false;
    if (f.formation && a.formation !== f.formation) return false;
    return true;
  }), [actions, f]);

  const fundDist = useMemo(() => funds.map((fd) => ({ name: fd.name, value: filtered.filter((a) => a.fundamento_id === fd.id).length, color: fd.color })).filter((x) => x.value > 0), [filtered, funds]);
  const total = filtered.length;

  const Sel = ({ k, placeholder, options, testid }) => (
    <select data-testid={testid} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/60">
      <option value="">{placeholder}</option>{options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );

  // ---- Reception A/B/C ----
  const recepClasses = useMemo(() => classes.filter((c) => recepFund && c.fundamento_id === recepFund.id), [classes, recepFund]);
  const recepActions = useMemo(() => actions.filter((a) => recepFund && a.fundamento_id === recepFund.id && (!recFormation || a.formation === recFormation) && (!f.video || a.video_id === f.video)), [actions, recepFund, recFormation, f.video]);
  const recepByFormation = useMemo(() => formations.map((fo) => {
    const list = recepActions.filter((a) => a.formation === fo.name);
    const row = { name: fo.name, total: list.length };
    recepClasses.forEach((c) => (row[c.label] = list.filter((a) => a.classificacao_id === c.id).length));
    return row;
  }).filter((r) => r.total > 0), [recepActions, formations, recepClasses]);

  // ---- Formation analysis ----
  const fmActions = useMemo(() => actions.filter((a) => selFormation && a.formation === selFormation && (!f.video || a.video_id === f.video)), [actions, selFormation, f.video]);
  const k1Attacks = fmActions.filter((a) => ataqueFund && a.fundamento_id === ataqueFund.id && a.phase === "K1");
  const k1Points = k1Attacks.filter((a) => (a.classificacao_label || "").toLowerCase().includes("ponto") || a.result === "Ponto nosso").length;

  // ---- Heatmap ----
  const heatActions = useMemo(() => actions.filter((a) => (!heatFund || a.fundamento_id === heatFund) && a.court && (a.court.zone != null || a.court.point) && (!f.video || a.video_id === f.video)), [actions, heatFund, f.video]);
  const heatPoints = heatActions.map((a) => ({ zone: a.court.zone, x: a.court.point?.x, y: a.court.point?.y }));

  return (
    <Layout title="Análises e Relatórios" subtitle="Estatísticas coletivas, por formação e mapas de calor" back="/"
      actions={<a data-testid="reports-export" href={exportCsvUrl(f.video ? { video_id: f.video } : {})} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary/40"><Download size={16} /> Exportar CSV</a>}>
      <Tabs defaultValue="geral">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="geral" data-testid="rtab-geral">Geral</TabsTrigger>
          <TabsTrigger value="recepcao" data-testid="rtab-recepcao">Recepção A/B/C</TabsTrigger>
          <TabsTrigger value="formacao" data-testid="rtab-formacao">Por Formação</TabsTrigger>
          <TabsTrigger value="mapa" data-testid="rtab-mapa">Mapa de Calor</TabsTrigger>
        </TabsList>

        {/* GERAL */}
        <TabsContent value="geral" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 mb-5">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground"><Filter size={15} /> Filtros</div>
            <div className="flex flex-wrap gap-2">
              <Sel k="video" placeholder="Todas as partidas" testid="filter-video" options={videos.map((v) => ({ v: v.id, l: v.title }))} />
              <Sel k="athlete" placeholder="Todos os atletas" testid="filter-athlete" options={athletes.map((a) => ({ v: a.id, l: `${a.number ? a.number + " · " : ""}${a.name}` }))} />
              <Sel k="fundamento" placeholder="Todos os fundamentos" testid="filter-fund" options={funds.map((x) => ({ v: x.id, l: x.name }))} />
              <Sel k="classificacao" placeholder="Toda classificação" testid="filter-class" options={classes.filter((c) => !f.fundamento || c.fundamento_id === f.fundamento).map((c) => ({ v: c.id, l: c.label }))} />
              <Sel k="formation" placeholder="Toda formação" testid="filter-formation" options={formations.map((p) => ({ v: p.name, l: p.name }))} />
              <Sel k="position" placeholder="Toda posição" testid="filter-pos" options={positions.map((p) => ({ v: p.name, l: p.name }))} />
              <Sel k="phase" placeholder="Toda situação" testid="filter-phase" options={["K1", "K2", "K3", "Continuidade", "Contra-ataque"].map((x) => ({ v: x, l: x }))} />
              <button data-testid="clear-filters" onClick={() => setF({ video: "", athlete: "", fundamento: "", classificacao: "", position: "", phase: "", formation: "" })} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Limpar</button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[["Ações", total], ["Fundamentos", fundDist.length], ["Atletas", new Set(filtered.flatMap((a) => a.athlete_ids || [])).size], ["Partidas", new Set(filtered.map((a) => a.video_id)).size]].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-border bg-card p-4"><div className="font-data text-3xl font-bold text-primary">{v}</div><div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div></div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 mb-5">
            <h3 className="ava-heading text-lg font-bold mb-3">Distribuição por fundamento</h3>
            {fundDist.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={fundDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} label={(e) => `${e.name} ${e.value}`}>{fundDist.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} /></PieChart></ResponsiveContainer></div> : <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sem dados.</div>}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="ava-heading text-lg font-bold">Ocorrências ({total})</h3></div>
            <div className="divide-y divide-border max-h-[420px] overflow-auto scrollbar-thin">
              {filtered.length === 0 ? <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma ocorrência.</div> : filtered.map((a, i) => {
                const fd = funds.find((x) => x.id === a.fundamento_id);
                return (
                  <button key={a.id} data-testid={`report-row-${a.id}`} onClick={() => navigate(`/analisar/${a.video_id}?t=${a.timestamp}&action=${a.id}`)} className="w-full flex items-center gap-3 p-3 hover:bg-secondary/40 text-left">
                    <span className="font-data text-xs text-muted-foreground w-6">{i + 1}</span>
                    <span className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary"><Play size={14} /></span>
                    <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{(a.athlete_ids || []).map((id) => athleteById[id]?.name).filter(Boolean).join(", ") || "—"}</div><div className="text-xs text-muted-foreground truncate">{videoById[a.video_id]?.title} · {a.formation || "—"} {a.phase ? `· ${a.phase}` : ""}</div></div>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: (fd?.color || "#888") + "22", color: fd?.color }}>{a.fundamento_name}</span>
                    <span className="text-xs hidden sm:block">{a.classificacao_label}</span>
                    <span className="font-data text-xs text-muted-foreground">{formatTime(a.timestamp)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* RECEPÇÃO */}
        <TabsContent value="recepcao" className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2 items-center">
            <select data-testid="rec-formation" value={recFormation} onChange={(e) => setRecFormation(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"><option value="">Todas as formações</option>{formations.map((fo) => <option key={fo.id} value={fo.name}>{fo.name}</option>)}</select>
            <span className="text-sm text-muted-foreground">{recepActions.length} recepções efetivas (base dos percentuais)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recepClasses.map((c) => { const n = recepActions.filter((a) => a.classificacao_id === c.id).length; return (
              <div key={c.id} data-testid={`rec-class-${c.id}`} className="rounded-xl border border-border p-4" style={{ borderColor: c.color + "55" }}>
                <div className="text-xs font-semibold" style={{ color: c.color }}>Recepção {c.label}</div>
                <div className="font-data text-3xl font-bold">{n}</div>
                <div className="text-xs text-muted-foreground">{pct(n, recepActions.length)}% das recepções</div>
              </div>
            ); })}
          </div>
          {recepByFormation.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="ava-heading text-lg font-bold mb-3">Recepção por formação</h3>
              <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={recepByFormation}><XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} /><Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} cursor={{ fill: "hsl(var(--secondary))" }} />{recepClasses.map((c) => <Bar key={c.id} dataKey={c.label} stackId="a" fill={c.color} radius={[2, 2, 0, 0]} />)}</BarChart></ResponsiveContainer></div>
            </div>
          )}
        </TabsContent>

        {/* FORMAÇÃO */}
        <TabsContent value="formacao" className="mt-4 space-y-5">
          <div className="flex gap-2 flex-wrap">
            {formations.map((fo) => <button key={fo.id} data-testid={`fm-${fo.name}`} onClick={() => setSelFormation(fo.name)} className={cn("rounded-full px-4 py-2 text-sm font-semibold border", selFormation === fo.name ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground")}>{fo.name}</button>)}
          </div>
          {!selFormation ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Selecione uma formação para analisar.</div> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["Oportunidades", fmActions.length], ["Ataques K1", k1Attacks.length], ["Pontos K1", k1Points], ["Eficiência K1", `${pct(k1Points, k1Attacks.length)}%`]].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-border bg-card p-4"><div className="font-data text-3xl font-bold text-primary">{v}</div><div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div></div>
              ))}
              <div className="col-span-2 sm:col-span-4 rounded-2xl border border-border bg-card p-5">
                <h3 className="ava-heading text-lg font-bold mb-3">Ações na {selFormation} por fundamento</h3>
                <div className="flex flex-wrap gap-2">{funds.map((fd) => { const n = fmActions.filter((a) => a.fundamento_id === fd.id).length; if (!n) return null; return <span key={fd.id} className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: fd.color + "22", color: fd.color }}>{fd.name}: {n}</span>; })}</div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* MAPA DE CALOR */}
        <TabsContent value="mapa" className="mt-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <select data-testid="heat-fund" value={heatFund} onChange={(e) => setHeatFund(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"><option value="">Todos os fundamentos</option>{funds.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <Sel k="video" placeholder="Todas as partidas" testid="heat-video" options={videos.map((v) => ({ v: v.id, l: v.title }))} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="ava-heading text-lg font-bold mb-3">Distribuição na quadra ({heatActions.length} ações localizadas)</h3>
              <div className="max-w-[320px] mx-auto"><CourtMap editable={false} heatPoints={heatPoints} /></div>
              <p className="text-xs text-muted-foreground mt-3 text-center">Intensidade por zona (números = ocorrências). Rede no topo.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="ava-heading text-lg font-bold mb-3">Como ler os mapas</h3>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                <li>O mapa diferencia <b>localização da bola</b>, <b>posição do atleta</b> e <b>resultado</b> — cada lance guarda a zona, o ponto preciso e a direção.</li>
                <li>Marque a quadra durante a análise (barra ⚡ → mapa) para alimentar estes mapas.</li>
                <li>Filtre por fundamento e partida para comparar padrões.</li>
              </ul>
              {heatActions.length === 0 && <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Ainda não há lances com local marcado na quadra para os filtros atuais.</div>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
