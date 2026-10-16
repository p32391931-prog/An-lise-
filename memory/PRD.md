# PRD — AVA Vôlei Analytics (Análise de vídeo de voleibol)

## Problem statement
Melhorar o app de análise de vídeo de voleibol da AVA (Associação Voleibol Assisense): identidade visual vermelho/preto moderna, página inicial central, galeria de vídeos, pastas de atletas, análise técnica (marcar fundamentos no tempo exato, classificar, identificar atletas), marcações visuais sobre o vídeo, relatórios coletivos e individuais e exportação. Estrutura integrada e preparada para acesso futuro dos atletas.

## User choices (gathered)
- Vídeos: link do YouTube **e** envio de arquivo (object storage).
- Primeira versão inclui: análise técnica, cadastro + fundamentos/classificações configuráveis, relatórios, marcações visuais, (exportação parcial).
- Login: pulado por enquanto (admin-only / aberto).

## Architecture
- Backend: FastAPI + MongoDB (uuid string ids, `_id` excluded). Emergent object storage for uploads (`/api/upload`, `/api/files/{path}`). Auto-seed on startup.
- Frontend: React 19 + React Router + Tailwind + shadcn/ui + Recharts + lucide-react. Dark theme default (AVA red/black), light theme toggle. Fonts: Barlow Condensed (headings), Inter (body), JetBrains Mono (data).
- Collections: videos, athletes, positions, fundamentos, classificacoes, actions, saved_filters, settings, files.

## Personas
- Treinador/analista (admin): importa vídeos, analisa, marca, gera relatórios.
- (Futuro) Atleta: acesso individual aos próprios materiais.

## Implemented (2026-06) — Iteration 1
- Identidade visual AVA (vermelho/preto/neutros), responsiva, dark+light.
- Home dashboard, galeria (YouTube/upload), atletas + dossiê, análise técnica, fundamentos/classificações/posições configuráveis, relatórios, marcações SVG, exportação CSV, duração padrão de clipe.

## Implemented (2026-06) — Iteration 2
- **Clique-no-fundamento durante a reprodução**: barra rápida ⚡ pausa automática no tempo exato e abre o editor de trecho; "Salvar e continuar" retoma do ponto.
- **Editor de recorte**: antes/depois, início/fim = tempo atual, prévia do clipe; recorte não destrutivo (clip_start/clip_end em metadados).
- **Novos campos do lance**: set, formação/rotação, situação tática (K1/K2/K3/Continuidade/Contra-ataque), resultado, e **mapa da quadra de 9 zonas** (ponto + zona + seta de direção).
- **Formações (P1–P6) configuráveis**; **arquivar/reativar** fundamentos e classificações (histórico preservado).
- **Rallies**: relacionar ações da mesma jogada (situação tática) via /api/rallies/link.
- **Relatórios por abas**: Geral, Recepção A/B/C (com %), Por Formação (eficiência K1), Mapa de Calor (quadra).
- **Análise Inteligente (IA)**: Claude (claude-sonnet-5-5) via chave Emergent, respostas fundamentadas nos dados, informa amostra e limitações, distingue padrão de hipótese.

## Backlog / remaining
- P1: Exportação de VÍDEO renderizado (clipe/compilação com/sem marcações gravadas) — guardar edições em metadados para render em outro servidor (conforme pedido do usuário).
- P1: Filtros salvos (UI) e compilações temáticas.
- P2: Comparação entre partidas (tela dedicada de evolução).
- P2: Timing por elemento de marcação; pastas personalizadas; quadro tático dedicado.
- Futuro: contas/permissões de atletas; integração com app principal da AVA.

## Next tasks
- Implementar UI de filtros salvos e compilações.
- Agrupamento de rally (K1/K2) e visualização de sequência.
