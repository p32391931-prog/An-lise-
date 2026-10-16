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

## Implemented (2026-06)
- Identidade visual AVA (vermelho/preto/neutros), responsiva, dark+light.
- Home dashboard com cards centrais e estatísticas ao vivo.
- Galeria de vídeos: adicionar (YouTube/upload), miniaturas, status (pendente/em análise/concluído), busca e filtros, excluir.
- Atletas: CRUD, filtro por posição, pasta/dossiê individual (radar + breakdown por fundamento/classificação, clipes clicáveis → análise).
- Posições, fundamentos e classificações configuráveis (Settings).
- Análise técnica: player YouTube/HTML5 com controles (play/pause, ±5s, frame, velocidade, seek), marcar lance no tempo exato (fundamento → classificação → atletas → posição/fase/clip/nota), timeline de lances, editar/retime/excluir, reproduzir clipe (antes/depois).
- Marcações visuais SVG não destrutivas (seta, linha, retângulo, círculo, trajetória, texto; cor, espessura, undo, excluir, limpar) salvas por lance.
- Relatórios: filtros combinados (partida/atleta/fundamento/classificação/posição/fase), gráficos (pizza + barras empilhadas), eficácia %, lista de ocorrências clicável → lance.
- Exportação CSV (relatórios e por atleta).
- Config de duração padrão de clipe (antes/depois).

## Backlog / remaining
- P1: Exportação de VÍDEO renderizado (clipe/compilação com/sem marcações gravadas na imagem) — NÃO implementado (atualmente só CSV + reprodução de clipe no app; burn-in server-side inviável para YouTube).
- P1: Filtros personalizados salvos (modelo salvo no backend existe via saved_filters; UI de salvar/aplicar pendente).
- P1: Timing por elemento de marcação (aparecer/desaparecer) e redimensionar/girar elementos.
- P2: Análise de sequências K1/K2 com rally_id agrupando lances (campo fase já registrado).
- P2: Pastas personalizadas / mover clipes manualmente.
- P2: Quadro tático dedicado (desenho em quadra vazia).
- Futuro: contas e permissões de atletas; integração com app principal da AVA.

## Next tasks
- Implementar UI de filtros salvos e compilações.
- Agrupamento de rally (K1/K2) e visualização de sequência.
