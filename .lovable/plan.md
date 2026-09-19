# Fase 06 — Redesign premium, personalização e Agente pessoal

## O que encontrei hoje (auditoria rápida)

- **Visual**: tudo é um retângulo arredondado. Cartões iguais em todo o lado, muito verde, espaçamentos inconsistentes, títulos sem hierarquia clara. Parece um painel de administração, não um produto pessoal.
- **Botões**: usam o estilo base da biblioteca, sem estados de pressão/carregamento próprios e com o verde a dominar ecrãs inteiros.
- **Navegação**: barra inferior com Início, Transações, "+", Objetivos, Mais; no computador uma lista de links longa (Contas, Carteiras, Mapa, Recorrentes...). Está a crescer sem estrutura.
- **Início**: mostra demasiados cartões ao mesmo tempo (património, disponível, protegido, mapa, potes, resumo do mês, atividade) — todos com o mesmo peso visual.
- **Números**: sem numerais tabulares consistentes; quase tudo a negrito.
- **Definições**: uma lista comprida sem secções de personalização.
- **Continua verdade**: o motor financeiro (`src/lib/finance/engine.ts`) permanece a única fonte de cálculo. Nada disto muda.

## Parte A — Redesign

1. **Fundação visual**: escala de espaçamento, raios, sombras e tipografia em `src/styles.css`; tema claro desenhado de propósito (não invertido); tokens de acento trocáveis (Esmeralda, Azul, Violeta, Âmbar, Neutro) todos testados para contraste.
2. **Tipografia financeira**: níveis Display / Título / Secção / Corpo / Secundário / Legenda / Meta, com numerais tabulares nos valores.
3. **Sistema de botões**: variantes Primário, Secundário, Fantasma, Perigo, Ícone, Ação flutuante e Ação compacta, com estados de foco, pressão, desativado e a carregar.
4. **Cartões**: variantes Herói financeiro, Padrão, Compacto, Interativo, Objetivo, Conta e Informação — deixam de ser todos iguais; mais respiro, menos caixas.
5. **Navegação**: telemóvel passa a Início · Atividade · Adicionar · Plano · Agente, com Contas, Carteiras, Mapa, Recorrentes e Definições dentro de "Plano" e do perfil. Computador recebe uma barra lateral agrupada.
6. **Ação central**: o "+" passa a fazer parte da barra (não um círculo solto) e abre uma folha premium com Entrada, Despesa, Transferência, Redistribuição.
7. **Início**: saudação → Disponível → Posição financeira → 1–2 objetivos → Atividade recente → um facto útil. Cartão do Agente quando houver algo verdadeiro a dizer.
8. **Movimento**: transições curtas em folhas, mudanças de número e progresso de objetivos; respeita "reduzir movimento".

## Parte B — Personalização

- Nova secção **Definições → Personalização**: tema (escuro/claro/sistema), cor de acento, densidade, página inicial predefinida, modo privado, módulos do painel e a sua ordem.
- **Personalizar painel**: modo de edição com mostrar/esconder e reordenar módulos (Disponível, Património, Protegido, Mapa, Objetivos, Atividade, Próximos pagamentos, Gastos do mês, Construção, Resumo do Agente) e "Restaurar padrão".
- **Terminologia**: o utilizador pode renomear rótulos (ex.: "Construção" → "Património"). Só muda o texto apresentado; os identificadores internos nunca mudam.
- Tudo guardado num único sítio de preferências (`user_preferences`), não espalhado.

## Parte C — Agente pessoal

- **Novo separador Agente** com conversas, sugestões ("Como estou este mês?", "Quanto posso gastar?"), composer e histórico (nova conversa, renomear, apagar, pesquisar).
- **Regra central**: o modelo nunca calcula saldos. A aplicação calcula os factos com o motor existente e envia um resumo compacto e limitado; o modelo apenas explica.
- **Ferramentas de leitura**: resumo financeiro, disponível para gastar, saldos de contas, saldos de carteiras, estado de objetivos, transações, gastos por categoria, próximos pagamentos, regra financeira, resumo do mês, contexto pessoal.
- **Ações preparadas**: despesa, entrada, transferência, redistribuição, contribuição para objetivo, criação de objetivo. O Agente apresenta antes/depois com Confirmar / Editar / Cancelar; só a confirmação executa, e sempre através do motor financeiro. Cada ação preparada fica registada (tipo, valores, confirmada ou não, resultado).
- **Memória estruturada**: categorias Objetivos, Vida, Trabalho, Família, Preferências, Planos, Filosofia financeira, Outro. Visível e editável em Definições → Agente → Memória; nada é guardado sem o utilizador saber.
- **Perfil e personalidade**: nome preferido, foco atual, prioridades; nome do Agente, ícone, estilo (Conciso / Equilibrado / Detalhado), resumos e insights ligados/desligados.
- **Resumos**: base para Resumo do dia, Revisão semanal e Fecho do mês — os números são calculados pela aplicação.
- **Falha do Agente**: se a IA não responder, mostra "O Agente está temporariamente indisponível." e toda a aplicação financeira continua a funcionar.

## Notas técnicas

- Chave de IA fica **só no servidor** (função de servidor via Lovable AI); nunca chega ao navegador.
- Os dados financeiros continuam guardados neste dispositivo (a base de dados, o login e as regras de acesso por utilizador ainda não existem — é a dívida técnica da Fase 04/05). Por isso o contexto do Agente é montado no cliente a partir do motor e enviado já resumido e limitado; conversas, memória e preferências ficam também guardadas no dispositivo, com o modelo de dados preparado para migrar para a base de dados com regras de acesso por utilizador na fase em que ligarmos o backend.
- Motor financeiro, contabilidade e lógica das Fases 02–05 ficam intactos; nenhum cálculo é duplicado.
- Testes A–N verificados no navegador (telemóvel e computador) antes de fechar a fase.

## Fora do âmbito

Fase 07 não começa automaticamente.
