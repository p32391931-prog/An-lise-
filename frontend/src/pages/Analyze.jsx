import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AnnotationLayer } from "@/components/AnnotationLayer";
import { CourtMap } from "@/components/CourtMap";
import {
  getVideo, getFundamentos, getClassificacoes, getAthletes, getPositions, getFormations, getSettings,
  getActions, createAction, updateAction, deleteAction, setVideoStatus, linkRally,
} from "@/lib/api";
import { formatTime } from "@/lib/format";
import {
  Play, Pause, Rewind, FastForward, Plus, Trash2, Save, MousePointer2, ArrowUpRight,
  Minus, Square, Circle, Type, Spline, Undo2, Eraser, Clock, Check, Users, X, Scissors, Link2, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TOOLS = [
  { id: "select", icon: MousePointer2 }, { id: "arrow", icon: ArrowUpRight }, { id: "line", icon: Minus },
  { id: "rect", icon: Square }, { id: "ellipse", icon: Circle }, { id: "trajectory", icon: Spline }, { id: "text", icon: Type },
];
const COLORS = ["#E50914", "#F59E0B", "#10B981", "#3B82F6", "#FFFFFF"];
const SITUATIONS = ["K1", "K2", "K3", "Continuidade", "Contra-ataque"];
const RESULTS = ["Ponto nosso", "Ponto adversário", "Continuidade"];
const base = { fundamento_id: "", classificacao_id: "", athlete_ids: [], tactical_position: "", phase: "", note: "", clip_before: 5, clip_after: 4, set_number: "", formation: "", result: "", court: null };

export default function Analyze() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const playerRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [funds, setFunds] = useState([]);
  const [classes, setClasses] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [positions, setPositions] = useState([]);
  const [formations, setFormations] = useState([]);
  const [actions, setActions] = useState([]);

  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  const [form, setForm] = useState(base);
  const [markTime, setMarkTime] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [annos, setAnnos] = useState([]);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#E50914");
  const [width, setWidth] = useState(4);
  const [selEl, setSelEl] = useState(null);
  const [showCourt, setShowCourt] = useState(true);
  const [rallySel, setRallySel] = useState([]);
  const [rallySit, setRallySit] = useState("K1");
  const clipStop = useRef(null);

  const reloadActions = useCallback(() => getActions({ video_id: videoId }).then(setActions), [videoId]);

  useEffect(() => {
    Promise.all([getVideo(videoId), getFundamentos(), getClassificacoes(), getAthletes(), getPositions(), getFormations(), getSettings(), getActions({ video_id: videoId })])
      .then(([v, f, c, a, p, fo, s, acts]) => {
        setVideo(v); setFunds(f.filter((x) => x.active !== false && !x.archived)); setClasses(c.filter((x) => x.active !== false && !x.archived));
        setAthletes(a.filter((x) => x.active !== false)); setPositions(p.filter((x) => x.active !== false)); setFormations(fo.filter((x) => x.active !== false));
        setForm((fm) => ({ ...fm, clip_before: s.default_clip_before, clip_after: s.default_clip_after }));
        setActions(acts);
      });
  }, [videoId]);

  useEffect(() => {
    const t = sp.get("t"); const aid = sp.get("action");
    if (t) setTimeout(() => playerRef.current?.seekTo(Math.max(0, parseFloat(t))), 1200);
    if (aid && actions.length) { const a = actions.find((x) => x.id === aid); if (a) selectAction(a); }
    // eslint-disable-next-line
  }, [actions.length]);

  const onTime = useCallback((t) => {
    setTime(t);
    if (clipStop.current != null && t >= clipStop.current) { playerRef.current?.pause(); clipStop.current = null; setPlaying(false); }
  }, []);

  const togglePlay = () => { if (!playerRef.current) return; if (playing) { playerRef.current.pause(); setPlaying(false); } else { clipStop.current = null; playerRef.current.play(); setPlaying(true); } };
  const seekBy = (d) => playerRef.current?.seekTo(Math.max(0, Math.min(duration || 1e9, time + d)));
  const changeRate = (r) => { setRate(r); playerRef.current?.setRate(r); };
  const fundClasses = useMemo(() => classes.filter((c) => c.fundamento_id === form.fundamento_id), [classes, form.fundamento_id]);
  const activeFund = useMemo(() => funds.find((f) => f.id === form.fundamento_id), [funds, form.fundamento_id]);

  // ---- Click-to-mark during playback ----
  const quickMark = (fundId) => {
    const now = playerRef.current?.getCurrentTime?.() ?? time;
    playerRef.current?.pause(); setPlaying(false); clipStop.current = null;
    setMarkTime(now);
    setEditingId(null); setDrafting(true); setAnnos([]); setSelEl(null);
    const fund = funds.find((f) => f.id === fundId);
    setForm((f) => ({ ...base, clip_before: f.clip_before, clip_after: f.clip_after, formation: f.formation, set_number: f.set_number, fundamento_id: fundId }));
    setShowCourt(fund?.uses_court !== false);
    toast.info(`${fund?.name} marcado em ${formatTime(now)} — edite e salve`);
  };

  const selectAction = (a) => {
    setEditingId(a.id); setDrafting(true); setMarkTime(a.timestamp);
    setForm({ fundamento_id: a.fundamento_id || "", classificacao_id: a.classificacao_id || "", athlete_ids: a.athlete_ids || [], tactical_position: a.tactical_position || "", phase: a.phase || "", note: a.note || "", clip_before: a.clip_before ?? 5, clip_after: a.clip_after ?? 4, set_number: a.set_number ?? "", formation: a.formation || "", result: a.result || "", court: a.court || null });
    setAnnos(a.annotations || []); setSelEl(null);
    playerRef.current?.pause(); setPlaying(false); playerRef.current?.seekTo(a.timestamp);
  };

  const cancelDraft = () => { setDrafting(false); setEditingId(null); setForm(base); setAnnos([]); playerRef.current?.seekTo(markTime); };
  const toggleAthlete = (id) => setForm((f) => ({ ...f, athlete_ids: f.athlete_ids.includes(id) ? f.athlete_ids.filter((x) => x !== id) : [...f.athlete_ids, id] }));

  const clipStart = Math.max(0, markTime - Number(form.clip_before || 0));
  const clipEnd = Math.min(duration || 1e9, markTime + Number(form.clip_after || 0));

  const buildBody = () => {
    const fund = funds.find((x) => x.id === form.fundamento_id);
    const cls = classes.find((x) => x.id === form.classificacao_id);
    return {
      video_id: videoId, timestamp: markTime,
      fundamento_id: form.fundamento_id, fundamento_name: fund?.name,
      classificacao_id: form.classificacao_id || null, classificacao_label: cls?.label || null,
      athlete_ids: form.athlete_ids, tactical_position: form.tactical_position || null, phase: form.phase || null,
      note: form.note, clip_before: Number(form.clip_before), clip_after: Number(form.clip_after),
      clip_start: clipStart, clip_end: clipEnd, annotations: annos,
      set_number: form.set_number === "" ? null : Number(form.set_number), formation: form.formation || null,
      result: form.result || null, court: form.court,
    };
  };

  const save = async (andContinue = false) => {
    if (!form.fundamento_id) return toast.error("Selecione um fundamento");
    const body = buildBody();
    let savedId = editingId;
    if (editingId) { await updateAction(editingId, body); toast.success("Lance atualizado"); }
    else { const created = await createAction(body); savedId = created.id; setEditingId(created.id); toast.success("Lance registrado!"); }
    await reloadActions();
    if (video?.status === "pendente") { setVideoStatus(videoId, "em_analise"); setVideo((v) => ({ ...v, status: "em_analise" })); }
    if (andContinue) { setDrafting(false); setForm(base); setAnnos([]); playerRef.current?.seekTo(markTime); playerRef.current?.play(); setPlaying(true); }
  };

  const retime = async () => { if (!editingId) return; const newT = playerRef.current?.getCurrentTime?.() ?? time; setMarkTime(newT); await updateAction(editingId, { ...buildBody(), timestamp: newT }); toast.success("Tempo do lance atualizado"); reloadActions(); };
  const removeAction = async (id) => { await deleteAction(id); if (editingId === id) cancelDraft(); toast.success("Lance excluído"); reloadActions(); };

  const playClip = (a) => {
    const start = Math.max(0, (a.clip_start != null ? a.clip_start : a.timestamp - (a.clip_before ?? 5)));
    clipStop.current = Math.min(duration || 1e9, (a.clip_end != null ? a.clip_end : a.timestamp + (a.clip_after ?? 4)));
    playerRef.current?.seekTo(start); playerRef.current?.play(); setPlaying(true);
  };
  const previewDraftClip = () => { clipStop.current = clipEnd; playerRef.current?.seekTo(clipStart); playerRef.current?.play(); setPlaying(true); };

  const undo = () => setAnnos((a) => a.slice(0, -1));
  const delSelEl = () => { if (selEl) { setAnnos((a) => a.filter((e) => e.id !== selEl)); setSelEl(null); } };
  const markComplete = async () => { await setVideoStatus(videoId, "concluido"); setVideo((v) => ({ ...v, status: "concluido" })); toast.success("Análise concluída!"); };

  const toggleRally = (id) => setRallySel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const doLinkRally = async () => {
    if (rallySel.length < 2) return toast.error("Selecione ao menos 2 lances");
    await linkRally({ video_id: videoId, action_ids: rallySel, situation: rallySit, label: rallySit });
    toast.success("Jogada relacionada!"); setRallySel([]); reloadActions();
  };

  if (!video) return <Layout back="/galeria"><div className="text-muted-foreground">Carregando análise...</div></Layout>;

  return (
    <Layout back="/galeria">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0"><h1 className="ava-heading text-2xl sm:text-3xl font-extrabold truncate">{video.title}</h1><p className="text-sm text-muted-foreground">{video.competition || ""} {video.opponent ? `· vs ${video.opponent}` : ""}</p></div>
        <button data-testid="mark-complete" onClick={markComplete} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:border-emerald-500/50"><Check size={16} className="text-emerald-500" /> Concluir análise</button>
      </div>

      {/* QUICK MARK BAR */}
      <div className="rounded-xl border border-primary/30 bg-card p-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary mr-1">⚡ Marcar durante o vídeo</span>
          {funds.map((f) => (
            <button key={f.id} data-testid={`quick-${f.id}`} onClick={() => quickMark(f.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition" style={{ background: f.color }}>{f.name}</button>
          ))}
          <span className="ml-auto font-data text-xs text-muted-foreground">Clique = pausa automática no tempo exato</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-3">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-black">
            <VideoPlayer ref={playerRef} video={video} onTime={onTime} onDuration={setDuration} />
            <AnnotationLayer elements={annos} onChange={setAnnos} tool={tool} color={color} strokeWidth={width} editable={drafting} selectedId={selEl} onSelect={setSelEl} />
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <input type="range" min={0} max={duration || 0} step={0.1} value={time} onChange={(e) => playerRef.current?.seekTo(parseFloat(e.target.value))} data-testid="seek-bar" className="w-full accent-[#E50914]" />
            <div className="flex items-center gap-2 flex-wrap">
              <button data-testid="seek-back" onClick={() => seekBy(-5)} className="rounded-lg border border-border p-2 hover:border-primary/40"><Rewind size={16} /></button>
              <button data-testid="play-pause" onClick={togglePlay} className="rounded-lg bg-primary p-2.5 text-primary-foreground hover:brightness-110">{playing ? <Pause size={18} /> : <Play size={18} />}</button>
              <button data-testid="seek-fwd" onClick={() => seekBy(5)} className="rounded-lg border border-border p-2 hover:border-primary/40"><FastForward size={16} /></button>
              <button onClick={() => seekBy(-1 / 15)} className="rounded-lg border border-border px-2 py-2 text-xs font-data hover:border-primary/40" data-testid="frame-back">◁</button>
              <button onClick={() => seekBy(1 / 15)} className="rounded-lg border border-border px-2 py-2 text-xs font-data hover:border-primary/40" data-testid="frame-fwd">▷</button>
              <span className="font-data text-sm text-muted-foreground ml-1">{formatTime(time)} / {formatTime(duration)}</span>
              <div className="ml-auto flex items-center gap-1">{[0.25, 0.5, 1].map((r) => <button key={r} onClick={() => changeRate(r)} data-testid={`rate-${r}`} className={cn("rounded-lg px-2 py-1 text-xs font-data border", rate === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>{r}x</button>)}</div>
            </div>
          </div>

          {drafting && (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Desenho</span>
                {TOOLS.map((t) => { const Icon = t.icon; return <button key={t.id} data-testid={`tool-${t.id}`} onClick={() => setTool(t.id)} className={cn("rounded-lg border p-2 transition", tool === t.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}><Icon size={16} /></button>; })}
                <div className="w-px h-6 bg-border mx-1" />
                {COLORS.map((c) => <button key={c} data-testid={`color-${c.replace("#", "")}`} onClick={() => setColor(c)} className={cn("h-7 w-7 rounded-full border-2", color === c ? "border-foreground scale-110" : "border-transparent")} style={{ background: c }} />)}
                <input type="range" min={2} max={10} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-16 accent-[#E50914]" data-testid="stroke-width" />
                <button onClick={undo} data-testid="undo-anno" className="rounded-lg border border-border p-2 text-muted-foreground hover:border-primary/40"><Undo2 size={16} /></button>
                <button onClick={delSelEl} disabled={!selEl} data-testid="del-element" className="rounded-lg border border-border p-2 text-muted-foreground hover:border-primary/40 disabled:opacity-40"><Trash2 size={16} /></button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-2 space-y-4">
          {drafting ? (
            <div className="rounded-xl border border-primary/40 bg-card p-4 ava-fade-up">
              <div className="flex items-center justify-between mb-3">
                <h3 className="ava-heading text-lg font-bold flex items-center gap-2"><Scissors size={16} className="text-primary" /> {editingId ? "Editar trecho" : "Novo trecho"}</h3>
                <button data-testid="cancel-draft" onClick={cancelDraft} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary"><X size={15} /></button>
              </div>

              {/* clip trim */}
              <div className="rounded-lg border border-border bg-background p-3 mb-3">
                <div className="flex items-center justify-between text-xs mb-2"><span className="font-semibold text-muted-foreground">RECORTE</span><span className="font-data text-primary">{formatTime(clipStart)} → {formatTime(clipEnd)} · {formatTime(markTime)}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted-foreground">Antes (s)<input type="number" data-testid="clip-before-field" value={form.clip_before} onChange={(e) => setForm({ ...form, clip_before: e.target.value })} className="w-full mt-0.5 rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-data outline-none focus:border-primary/60" /></label>
                  <label className="text-[11px] text-muted-foreground">Depois (s)<input type="number" data-testid="clip-after-field" value={form.clip_after} onChange={(e) => setForm({ ...form, clip_after: e.target.value })} className="w-full mt-0.5 rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-data outline-none focus:border-primary/60" /></label>
                </div>
                <div className="flex gap-2 mt-2">
                  <button data-testid="set-start-now" onClick={() => setForm({ ...form, clip_before: Math.max(0, (markTime - time)).toFixed(1) })} className="flex-1 rounded-lg border border-border py-1.5 text-[11px] hover:border-primary/40">Início = tempo atual</button>
                  <button data-testid="set-end-now" onClick={() => setForm({ ...form, clip_after: Math.max(0, (time - markTime)).toFixed(1) })} className="flex-1 rounded-lg border border-border py-1.5 text-[11px] hover:border-primary/40">Fim = tempo atual</button>
                  <button data-testid="preview-clip" onClick={previewDraftClip} className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"><Play size={12} className="inline" /> Prévia</button>
                </div>
              </div>

              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fundamento</label>
              <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
                {funds.map((f) => <button key={f.id} data-testid={`fund-${f.id}`} onClick={() => setForm((fm) => ({ ...fm, fundamento_id: f.id, classificacao_id: "" }))} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition", form.fundamento_id === f.id ? "text-white border-transparent" : "border-border text-muted-foreground hover:border-primary/40")} style={form.fundamento_id === f.id ? { background: f.color } : {}}>{f.name}</button>)}
              </div>

              {form.fundamento_id && (<><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classificação</label>
                <div className="flex flex-wrap gap-1.5 mt-1 mb-3">{fundClasses.map((c) => <button key={c.id} data-testid={`class-${c.id}`} onClick={() => setForm((fm) => ({ ...fm, classificacao_id: c.id }))} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold border", form.classificacao_id === c.id ? "text-white border-transparent" : "border-border text-muted-foreground hover:border-primary/40")} style={form.classificacao_id === c.id ? { background: c.color } : {}}>{c.symbol ? `${c.symbol} ` : ""}{c.label}</button>)}</div></>)}

              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Users size={12} /> Atletas</label>
              <div className="flex flex-wrap gap-1.5 mt-1 mb-3 max-h-24 overflow-auto scrollbar-thin">{athletes.map((a) => <button key={a.id} data-testid={`mark-athlete-${a.id}`} onClick={() => toggleAthlete(a.id)} className={cn("rounded-lg px-2 py-1 text-xs font-medium border", form.athlete_ids.includes(a.id) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>{a.number ? `${a.number} ` : ""}{a.name}</button>)}</div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <label className="text-[11px] text-muted-foreground">Set<input type="number" data-testid="mark-set" value={form.set_number} onChange={(e) => setForm({ ...form, set_number: e.target.value })} className="w-full mt-0.5 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary/60" /></label>
                <label className="text-[11px] text-muted-foreground">Formação<select data-testid="mark-formation" value={form.formation} onChange={(e) => setForm({ ...form, formation: e.target.value })} className="w-full mt-0.5 rounded-lg border border-border bg-background px-1 py-1.5 text-sm outline-none focus:border-primary/60"><option value="">—</option>{formations.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}</select></label>
                <label className="text-[11px] text-muted-foreground">Situação<select data-testid="mark-phase" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} className="w-full mt-0.5 rounded-lg border border-border bg-background px-1 py-1.5 text-sm outline-none focus:border-primary/60"><option value="">—</option>{SITUATIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <label className="text-[11px] text-muted-foreground">Posição no lance<select data-testid="mark-position" value={form.tactical_position} onChange={(e) => setForm({ ...form, tactical_position: e.target.value })} className="w-full mt-0.5 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary/60"><option value="">—</option>{positions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></label>
                <label className="text-[11px] text-muted-foreground">Resultado<select data-testid="mark-result" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} className="w-full mt-0.5 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary/60"><option value="">—</option>{RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
              </div>

              {/* court map */}
              <button onClick={() => setShowCourt((s) => !s)} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2"><MapPin size={13} className="text-primary" /> Mapa da quadra {form.court?.zone != null ? `· zona ${form.court.zone}` : ""} {showCourt ? "▲" : "▼"}</button>
              {showCourt && (
                <div className="mb-3">
                  <div className="max-w-[220px] mx-auto"><CourtMap value={form.court} onChange={(court) => setForm((f) => ({ ...f, court }))} editable /></div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-muted-foreground">Clique = ponto/zona · arraste = direção da bola</span>
                    {form.court && <button data-testid="clear-court" onClick={() => setForm({ ...form, court: null })} className="text-[11px] text-primary">limpar</button>}
                  </div>
                </div>
              )}

              <textarea data-testid="mark-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Observações" rows={2} className="w-full mb-3 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />

              <div className="flex gap-2">
                <button data-testid="save-action" onClick={() => save(false)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-card py-2.5 text-sm font-semibold text-primary hover:bg-primary/5"><Save size={16} /> Salvar</button>
                <button data-testid="save-continue" onClick={() => save(true)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110"><Play size={16} /> Salvar e continuar</button>
                {editingId && <button data-testid="retime-action" onClick={retime} title="Tempo = atual" className="rounded-lg border border-border px-3 hover:border-primary/40"><Clock size={16} /></button>}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-primary/40 bg-card p-6 text-center">
              <Scissors className="mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Clique num fundamento na barra <span className="text-primary font-semibold">⚡ acima</span> enquanto assiste. O vídeo pausa sozinho e abre a edição do trecho aqui.</p>
            </div>
          )}

          {/* timeline */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="ava-heading text-lg font-bold">Lances ({actions.length})</h3>
              {rallySel.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select value={rallySit} onChange={(e) => setRallySit(e.target.value)} data-testid="rally-situation" className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none">{SITUATIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                  <button data-testid="link-rally" onClick={doLinkRally} className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"><Link2 size={12} /> Relacionar ({rallySel.length})</button>
                </div>
              )}
            </div>
            <div className="divide-y divide-border max-h-[420px] overflow-auto scrollbar-thin">
              {actions.length === 0 ? <div className="p-5 text-center text-sm text-muted-foreground">Nenhum lance registrado ainda.</div> : actions.map((a) => {
                const fd = funds.find((x) => x.id === a.fundamento_id);
                return (
                  <div key={a.id} data-testid={`timeline-${a.id}`} className={cn("flex items-center gap-2 p-2.5 hover:bg-secondary/40", editingId === a.id && "bg-primary/5 border-l-2 border-primary")}>
                    <input type="checkbox" data-testid={`rally-check-${a.id}`} checked={rallySel.includes(a.id)} onChange={() => toggleRally(a.id)} className="accent-[#E50914]" />
                    <button onClick={() => playClip(a)} data-testid={`play-clip-${a.id}`} className="h-7 w-7 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25"><Play size={13} /></button>
                    <button onClick={() => selectAction(a)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="h-2 w-2 rounded-full" style={{ background: fd?.color }} />
                        <span className="text-sm font-medium truncate">{a.fundamento_name}</span>
                        {a.classificacao_label && <span className="text-xs text-muted-foreground">· {a.classificacao_label}</span>}
                        {a.formation && <span className="text-[10px] rounded bg-secondary px-1">{a.formation}</span>}
                        {a.phase && <span className="text-[10px] rounded bg-primary/15 text-primary px-1">{a.phase}</span>}
                        {a.court?.zone != null && <span className="text-[10px] rounded bg-secondary px-1">Z{a.court.zone}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{(a.athlete_ids || []).map((id) => athletes.find((x) => x.id === id)?.name).filter(Boolean).join(", ") || "—"}</div>
                    </button>
                    <span className="font-data text-xs text-muted-foreground">{formatTime(a.timestamp)}</span>
                    <button onClick={() => removeAction(a.id)} data-testid={`del-action-${a.id}`} className="text-muted-foreground hover:text-primary"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
