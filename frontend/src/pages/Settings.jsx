import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import {
  getFundamentos, createFundamento, updateFundamento, deleteFundamento,
  getClassificacoes, createClassificacao, updateClassificacao, deleteClassificacao,
  getPositions, createPosition, updatePosition, deletePosition,
  getSettings, updateSettings,
} from "@/lib/api";
import { Plus, Trash2, Save, GripVertical, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function SettingsPage() {
  const [funds, setFunds] = useState([]);
  const [classes, setClasses] = useState([]);
  const [positions, setPositions] = useState([]);
  const [settings, setSettings] = useState({ default_clip_before: 10, default_clip_after: 10 });
  const [newFund, setNewFund] = useState("");
  const [newPos, setNewPos] = useState("");

  const load = async () => {
    const [f, c, p, s] = await Promise.all([getFundamentos(), getClassificacoes(), getPositions(), getSettings()]);
    setFunds(f.filter((x) => x.active !== false));
    setClasses(c.filter((x) => x.active !== false));
    setPositions(p.filter((x) => x.active !== false));
    setSettings(s);
  };
  useEffect(() => { load(); }, []);

  const addFund = async () => { if (!newFund.trim()) return; await createFundamento({ name: newFund, color: "#E50914", order: funds.length }); setNewFund(""); toast.success("Fundamento criado"); load(); };
  const renameFund = async (f, name) => { await updateFundamento(f.id, { ...f, name }); };
  const recolorFund = async (f, color) => { await updateFundamento(f.id, { ...f, color }); load(); };
  const delFund = async (id) => { await deleteFundamento(id); toast.success("Fundamento desativado"); load(); };

  const addClass = async (fundId) => { await createClassificacao({ fundamento_id: fundId, label: "Nova", color: "#3B82F6", order: classes.filter((c) => c.fundamento_id === fundId).length }); load(); };
  const saveClass = async (c, patch) => { await updateClassificacao(c.id, { ...c, ...patch }); };
  const delClass = async (id) => { await deleteClassificacao(id); load(); };

  const addPos = async () => { if (!newPos.trim()) return; await createPosition({ name: newPos, order: positions.length }); setNewPos(""); toast.success("Posição criada"); load(); };
  const renamePos = async (p, name) => { await updatePosition(p.id, { ...p, name }); };
  const delPos = async (id) => { await deletePosition(id); toast.success("Posição desativada"); load(); };

  const saveSettings = async () => { await updateSettings({ default_clip_before: Number(settings.default_clip_before), default_clip_after: Number(settings.default_clip_after) }); toast.success("Padrões salvos"); };

  return (
    <Layout title="Configurações" subtitle="Fundamentos, classificações, posições e padrões de clipe" back="/">
      <Tabs defaultValue="fund" className="max-w-4xl">
        <TabsList>
          <TabsTrigger value="fund" data-testid="tab-fundamentos">Fundamentos</TabsTrigger>
          <TabsTrigger value="pos" data-testid="tab-positions">Posições</TabsTrigger>
          <TabsTrigger value="clip" data-testid="tab-clips">Clipes</TabsTrigger>
        </TabsList>

        <TabsContent value="fund" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <input data-testid="new-fund-input" value={newFund} onChange={(e) => setNewFund(e.target.value)} placeholder="Novo fundamento (ex: Cobertura)" className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60" />
            <button data-testid="add-fund-btn" onClick={addFund} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus size={16} /> Adicionar</button>
          </div>
          {funds.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <input type="color" value={f.color} onChange={(e) => recolorFund(f, e.target.value)} className="h-8 w-8 rounded cursor-pointer bg-transparent border border-border" data-testid={`fund-color-${f.id}`} />
                <input defaultValue={f.name} onBlur={(e) => renameFund(f, e.target.value)} className="flex-1 bg-transparent font-semibold outline-none border-b border-transparent focus:border-primary/40" data-testid={`fund-name-${f.id}`} />
                <button onClick={() => addClass(f.id)} data-testid={`add-class-${f.id}`} className="text-xs rounded-lg border border-border px-2.5 py-1.5 hover:border-primary/40 flex items-center gap-1"><Plus size={12} /> Classificação</button>
                <button onClick={() => delFund(f.id)} data-testid={`del-fund-${f.id}`} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary"><Trash2 size={14} /></button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {classes.filter((c) => c.fundamento_id === f.id).map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1">
                    <input type="color" defaultValue={c.color} onBlur={(e) => saveClass(c, { color: e.target.value })} className="h-5 w-5 rounded cursor-pointer bg-transparent border-0" />
                    <input defaultValue={c.label} onBlur={(e) => saveClass(c, { label: e.target.value })} className="w-20 bg-transparent text-sm outline-none" data-testid={`class-label-${c.id}`} />
                    <button onClick={() => delClass(c.id)} className="text-muted-foreground hover:text-primary"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="pos" className="space-y-3 mt-4">
          <div className="flex gap-2">
            <input data-testid="new-pos-input" value={newPos} onChange={(e) => setNewPos(e.target.value)} placeholder="Nova posição" className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60" />
            <button data-testid="add-pos-btn" onClick={addPos} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus size={16} /> Adicionar</button>
          </div>
          {positions.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <GripVertical size={16} className="text-muted-foreground" />
              <input defaultValue={p.name} onBlur={(e) => renamePos(p, e.target.value)} className="flex-1 bg-transparent font-medium outline-none" data-testid={`pos-name-${p.id}`} />
              <button onClick={() => delPos(p.id)} data-testid={`del-pos-${p.id}`} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary"><Trash2 size={14} /></button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="clip" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-6 max-w-md">
            <div className="flex items-center gap-2 mb-4 text-primary"><Clock size={18} /> <span className="font-semibold text-foreground">Duração padrão dos clipes</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Segundos antes</label>
                <input type="number" data-testid="clip-before" value={settings.default_clip_before} onChange={(e) => setSettings({ ...settings, default_clip_before: e.target.value })} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 font-data outline-none focus:border-primary/60" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Segundos depois</label>
                <input type="number" data-testid="clip-after" value={settings.default_clip_after} onChange={(e) => setSettings({ ...settings, default_clip_after: e.target.value })} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 font-data outline-none focus:border-primary/60" />
              </div>
            </div>
            <button data-testid="save-settings" onClick={saveSettings} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Save size={16} /> Salvar padrões</button>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
