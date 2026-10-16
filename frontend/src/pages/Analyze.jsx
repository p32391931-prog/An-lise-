import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AnnotationLayer } from "@/components/AnnotationLayer";
import {
  getVideo, getFundamentos, getClassificacoes, getAthletes, getPositions, getSettings,
  getActions, createAction, updateAction, deleteAction, setVideoStatus,
} from "@/lib/api";
import { formatTime } from "@/lib/format";
import {
  Play, Pause, Rewind, FastForward, Plus, Trash2, Save, MousePointer2, ArrowUpRight,
  Minus, Square, Circle, Type, Spline, Undo2, Eraser, Clock, Check, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TOOLS = [
  { id: "select", icon: MousePointer2, label: "Selecionar" },
  { id: "arrow", icon: ArrowUpRight, label: "Seta" },
  { id: "line", icon: Minus, label: "Linha" },
  { id: "rect", icon: Square, label: "Retângulo" },
  { id: "ellipse", icon: Circle, label: "Círculo" },
  { id: "trajectory", icon: Spline, label: "Trajetória" },
  { id: "text", icon: Type, label: "Texto" },
];
const COLORS = ["#E50914", "#F59E0B", "#10B981", "#3B82F6", "#FFFFFF"];
const emptyForm = { fundamento_id: "", classificacao_id: "", athlete_ids: [], tactical_position: "", phase: "", note: "", clip_before: 10, clip_after: 10 };

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
  const [actions, setActions] = useState([]);

  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [annos, setAnnos] = useState([]);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#E50914");
  const [width, setWidth] = useState(4);
  const [selEl, setSelEl] = useState(null);
  const clipStop = useRef(null);

  const reloadActions = useCallback(() => getActions({ video_id: videoId }).then(setActions), [videoId]);

  useEffect(() => {
    Promise.all([getVideo(videoId), getFundamentos(), getClassificacoes(), getAthletes(), getPositions(), getSettings(), getActions({ video_id: videoId })])
      .then(([v, f, c, a, p, s, acts]) => {
        setVideo(v); setFunds(f.filter((x) => x.active !== false)); setClasses(c.filter((x) => x.active !== false));
        setAthletes(a.filter((x) => x.active !== false)); setPositions(p.filter((x) => x.active !== false));
        setForm((fm) => ({ ...fm, clip_before: s.default_clip_before, clip_after: s.default_clip_after }));
        setActions(acts);
      });
  }, [videoId]);

  // deep link ?t=&action=
  useEffect(() => {
    const t = sp.get("t");
    const aid = sp.get("action");
    if (t && playerRef.current) {
      const n = parseFloat(t);
      const seek = () => playerRef.current?.seekTo(Math.max(0, n));
      setTimeout(seek, 1200);
    }
    if (aid && actions.length) {
      const a = actions.find((x) => x.id === aid);
      if (a) selectAction(a);
    }
    // eslint-disable-next-line
  }, [actions.length]);

  const onTime = useCallback((t) => {
    setTime(t);
    if (clipStop.current != null && t >= clipStop.current) {
      playerRef.current?.pause();
      clipStop.current = null;
      setPlaying(false);
    }
  }, []);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playing) { playerRef.current.pause(); setPlaying(false); }
    else { clipStop.current = null; playerRef.current.play(); setPlaying(true); }
  };
  const seekBy = (d) => playerRef.current?.seekTo(Math.max(0, Math.min(duration || 1e9, time + d)));
  const changeRate = (r) => { setRate(r); playerRef.current?.setRate(r); };

  const fundClasses = useMemo(() => classes.filter((c) => c.fundamento_id === form.fundamento_id), [classes, form.fundamento_id]);

  const resetForm = (settingsClip) => { setForm({ ...emptyForm, clip_before: settingsClip?.before ?? form.clip_before, clip_after: settingsClip?.after ?? form.clip_after }); setEditingId(null); setAnnos([]); setSelEl(null); };

  const selectAction = (a) => {
    setEditingId(a.id);
    setForm({ fundamento_id: a.fundamento_id || "", classificacao_id: a.classificacao_id || "", athlete_ids: a.athlete_ids || [], tactical_position: a.tactical_position || "", phase: a.phase || "", note: a.note || "", clip_before: a.clip_before ?? 10, clip_after: a.clip_after ?? 10 });
    setAnnos(a.annotations || []);
    setSelEl(null);
    playerRef.current?.pause(); setPlaying(false);
    playerRef.current?.seekTo(a.timestamp);
  };

  const startNew = () => { playerRef.current?.pause(); setPlaying(false); resetForm(); toast.info("Vídeo pausado. Preencha a marcação no tempo atual."); };

  const toggleAthlete = (id) => setForm((f) => ({ ...f, athlete_ids: f.athlete_ids.includes(id) ? f.athlete_ids.filter((x) => x !== id) : [...f.athlete_ids, id] }));

  const save = async () => {
    if (!form.fundamento_id) return toast.error("Selecione um fundamento");
    const fund = funds.find((x) => x.id === form.fundamento_id);
    const cls = classes.find((x) => x.id === form.classificacao_id);
    const body = {
      video_id: videoId,
      timestamp: editingId ? actions.find((a) => a.id === editingId)?.timestamp ?? time : time,
      fundamento_id: form.fundamento_id, fundamento_name: fund?.name,
      classificacao_id: form.classificacao_id || null, classificacao_label: cls?.label || null,
      athlete_ids: form.athlete_ids, tactical_position: form.tactical_position || null,
      phase: form.phase || null, note: form.note, clip_before: Number(form.clip_before), clip_after: Number(form.clip_after),
      annotations: annos,
    };
    if (editingId) { await updateAction(editingId, body); toast.success("Lance atualizado"); }
    else {
      const created = await createAction(body);
      setEditingId(created.id);
      toast.success("Lance registrado!");
    }
    reloadActions();
    if (video?.status === "pendente") setVideoStatus(videoId, "em_analise");
  };

  const retime = () => { if (!editingId) return; setForm((f) => ({ ...f })); saveRetime(); };
  const saveRetime = async () => { if (!editingId) return; await updateAction(editingId, { ...actions.find((a) => a.id === editingId), timestamp: time, annotations: annos }); toast.success("Tempo do lance atualizado"); reloadActions(); };

  const removeAction = async (id) => { await deleteAction(id); if (editingId === id) resetForm(); toast.success("Lance excluído"); reloadActions(); };

  const playClip = (a) => {
    const start = Math.max(0, a.timestamp - (a.clip_before ?? 10));
    clipStop.current = Math.min(duration || 1e9, a.timestamp + (a.clip_after ?? 10));
    playerRef.current?.seekTo(start);
    playerRef.current?.play();
    setPlaying(true);
  };

  const undo = () => setAnnos((a) => a.slice(0, -1));
  const clearAnnos = () => { setAnnos([]); setSelEl(null); };
  const delSelEl = () => { if (selEl) { setAnnos((a) => a.filter((e) => e.id !== selEl)); setSelEl(null); } };

  const markComplete = async () => { await setVideoStatus(videoId, "concluido"); setVideo((v) => ({ ...v, status: "concluido" })); toast.success("Análise concluída!"); };

  if (!video) return <Layout back="/galeria"><div className="text-muted-foreground">Carregando análise...</div></Layout>;

  return (
    <Layout back="/galeria">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="ava-heading text-2xl sm:text-3xl font-extrabold truncate">{video.title}</h1>
          <p className="text-sm text-muted-foreground">{video.competition || ""} {video.opponent ? `· vs ${video.opponent}` : ""}</p>
        </div>
        <button data-testid="mark-complete" onClick={markComplete} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:border-emerald-500/50"><Check size={16} className="text-emerald-500" /> Concluir análise</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT: player + annotation */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-black">
            <VideoPlayer ref={playerRef} video={video} onTime={onTime} onDuration={setDuration} />
            <AnnotationLayer elements={annos} onChange={setAnnos} tool={tool} color={color} strokeWidth={width} editable selectedId={selEl} onSelect={setSelEl} />
          </div>

          {/* control bar */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <input type="range" min={0} max={duration || 0} step={0.1} value={time} onChange={(e) => playerRef.current?.seekTo(parseFloat(e.target.value))} data-testid="seek-bar" className="w-full accent-[#E50914]" />
            <div className="flex items-center gap-2 flex-wrap">
              <button data-testid="seek-back" onClick={() => seekBy(-5)} className="rounded-lg border border-border p-2 hover:border-primary/40"><Rewind size={16} /></button>
              <button data-testid="play-pause" onClick={togglePlay} className="rounded-lg bg-primary p-2.5 text-primary-foreground hover:brightness-110">{playing ? <Pause size={18} /> : <Play size={18} />}</button>
              <button data-testid="seek-fwd" onClick={() => seekBy(5)} className="rounded-lg border border-border p-2 hover:border-primary/40"><FastForward size={16} /></button>
              <button onClick={() => seekBy(-1 / 15)} className="rounded-lg border border-border px-2 py-2 text-xs font-data hover:border-primary/40" data-testid="frame-back">◁ frame</button>
              <button onClick={() => seekBy(1 / 15)} className="rounded-lg border border-border px-2 py-2 text-xs font-data hover:border-primary/40" data-testid="frame-fwd">frame ▷</button>
              <span className="font-data text-sm text-muted-foreground ml-1">{formatTime(time)} / {formatTime(duration)}</span>
              <div className="ml-auto flex items-center gap-1">
                {[0.25, 0.5, 1].map((r) => (
                  <button key={r} onClick={() => changeRate(r)} data-testid={`rate-${r}`} className={cn("rounded-lg px-2 py-1 text-xs font-data border", rate === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>{r}x</button>
                ))}
              </div>
            </div>
          </div>

          {/* annotation toolbar */}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Desenho</span>
              {TOOLS.map((t) => { const Icon = t.icon; return (
                <button key={t.id} data-testid={`tool-${t.id}`} title={t.label} onClick={() => setTool(t.id)} className={cn("rounded-lg border p-2 transition", tool === t.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}><Icon size={16} /></button>
              ); })}
              <div className="w-px h-6 bg-border mx-1" />
              {COLORS.map((c) => (
                <button key={c} data-testid={`color-${c.replace("#", "")}`} onClick={() => setColor(c)} className={cn("h-7 w-7 rounded-full border-2 transition", color === c ? "border-foreground scale-110" : "border-transparent")} style={{ background: c }} />
              ))}
              <div className="w-px h-6 bg-border mx-1" />
              <input type="range" min={2} max={10} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-20 accent-[#E50914]" data-testid="stroke-width" />
              <button onClick={undo} data-testid="undo-anno" title="Desfazer" className="rounded-lg border border-border p-2 text-muted-foreground hover:border-primary/40"><Undo2 size={16} /></button>
              <button onClick={delSelEl} disabled={!selEl} data-testid="del-element" title="Excluir selecionado" className="rounded-lg border border-border p-2 text-muted-foreground hover:border-primary/40 disabled:opacity-40"><Trash2 size={16} /></button>
              <button onClick={clearAnnos} data-testid="clear-anno" title="Limpar tudo" className="rounded-lg border border-border p-2 text-muted-foreground hover:border-primary/40"><Eraser size={16} /></button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">As marcações são salvas junto ao lance ao clicar em <span className="font-semibold text-foreground">Salvar</span>. Selecione uma ferramenta e desenhe sobre o vídeo pausado.</p>
          </div>
        </div>

        {/* RIGHT: mark panel + timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-primary/30 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="ava-heading text-lg font-bold">{editingId ? "Editar lance" : "Nova marcação"}</h3>
              <span className="font-data text-sm rounded-lg bg-primary/15 px-2 py-1 text-primary">{formatTime(editingId ? (actions.find((a) => a.id === editingId)?.timestamp || 0) : time)}</span>
            </div>
            {!editingId && <button data-testid="pause-mark" onClick={startNew} className="w-full mb-3 rounded-lg border border-dashed border-primary/40 py-2 text-sm text-primary font-medium hover:bg-primary/5">⏸ Pausar no tempo atual</button>}

            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fundamento</label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
              {funds.map((f) => (
                <button key={f.id} data-testid={`fund-${f.id}`} onClick={() => setForm((fm) => ({ ...fm, fundamento_id: f.id, classificacao_id: "" }))} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition", form.fundamento_id === f.id ? "text-white border-transparent" : "border-border text-muted-foreground hover:border-primary/40")} style={form.fundamento_id === f.id ? { background: f.color } : {}}>{f.name}</button>
              ))}
            </div>

            {form.fundamento_id && (
              <>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classificação</label>
                <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
                  {fundClasses.map((c) => (
                    <button key={c.id} data-testid={`class-${c.id}`} onClick={() => setForm((fm) => ({ ...fm, classificacao_id: c.id }))} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition", form.classificacao_id === c.id ? "text-white border-transparent" : "border-border text-muted-foreground hover:border-primary/40")} style={form.classificacao_id === c.id ? { background: c.color } : {}}>{c.symbol ? `${c.symbol} ` : ""}{c.label}</button>
                  ))}
                </div>
              </>
            )}

            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Users size={12} /> Atletas</label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-3 max-h-28 overflow-auto scrollbar-thin">
              {athletes.map((a) => (
                <button key={a.id} data-testid={`mark-athlete-${a.id}`} onClick={() => toggleAthlete(a.id)} className={cn("rounded-lg px-2 py-1 text-xs font-medium border transition", form.athlete_ids.includes(a.id) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>{a.number ? `${a.number} ` : ""}{a.name}</button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Posição no lance</label>
                <select data-testid="mark-position" value={form.tactical_position} onChange={(e) => setForm({ ...form, tactical_position: e.target.value })} className="w-full mt-1 rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary/60">
                  <option value="">—</option>
                  {positions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fase (rally)</label>
                <select data-testid="mark-phase" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} className="w-full mt-1 rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary/60">
                  <option value="">—</option><option value="K1">K1</option><option value="K2">K2</option><option value="outras">Outras</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clipe antes (s)</label>
                <input type="number" data-testid="clip-before-field" value={form.clip_before} onChange={(e) => setForm({ ...form, clip_before: e.target.value })} className="w-full mt-1 rounded-lg border border-border bg-background px-2 py-2 text-sm font-data outline-none focus:border-primary/60" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clipe depois (s)</label>
                <input type="number" data-testid="clip-after-field" value={form.clip_after} onChange={(e) => setForm({ ...form, clip_after: e.target.value })} className="w-full mt-1 rounded-lg border border-border bg-background px-2 py-2 text-sm font-data outline-none focus:border-primary/60" />
              </div>
            </div>

            <textarea data-testid="mark-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Anotação do lance (opcional)" rows={2} className="w-full mb-3 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />

            <div className="flex gap-2">
              <button data-testid="save-action" onClick={save} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110"><Save size={16} /> {editingId ? "Salvar alterações" : "Salvar lance"}</button>
              {editingId && <button data-testid="retime-action" onClick={saveRetime} title="Atualizar tempo para o atual" className="rounded-lg border border-border px-3 hover:border-primary/40"><Clock size={16} /></button>}
              {editingId && <button data-testid="new-after-edit" onClick={() => resetForm()} className="rounded-lg border border-border px-3 text-sm hover:border-primary/40"><Plus size={16} /></button>}
            </div>
          </div>

          {/* timeline feed */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="ava-heading text-lg font-bold">Lances ({actions.length})</h3>
            </div>
            <div className="divide-y divide-border max-h-[420px] overflow-auto scrollbar-thin">
              {actions.length === 0 ? <div className="p-5 text-center text-sm text-muted-foreground">Nenhum lance registrado ainda.</div> : actions.map((a) => {
                const fd = funds.find((x) => x.id === a.fundamento_id);
                return (
                  <div key={a.id} data-testid={`timeline-${a.id}`} className={cn("flex items-center gap-2 p-2.5 hover:bg-secondary/40", editingId === a.id && "bg-primary/5 border-l-2 border-primary")}>
                    <button onClick={() => playClip(a)} data-testid={`play-clip-${a.id}`} className="h-7 w-7 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25"><Play size={13} /></button>
                    <button onClick={() => selectAction(a)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: fd?.color }} />
                        <span className="text-sm font-medium truncate">{a.fundamento_name}</span>
                        {a.classificacao_label && <span className="text-xs text-muted-foreground">· {a.classificacao_label}</span>}
                        {a.annotations?.length > 0 && <span className="text-[10px] rounded bg-secondary px-1">✎{a.annotations.length}</span>}
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
