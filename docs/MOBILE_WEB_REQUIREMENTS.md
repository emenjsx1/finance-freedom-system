# Experiência móvel (web)

O telemóvel é o alvo principal. O desktop continua suportado, mas nenhum ecrã é um
desktop encolhido.

## Larguras testadas

320, 360, 375, 390, 393, 414, 430 px (telemóvel), 768 (tablet), 1280 (desktop).
Nenhum ecrã pode ter deslocação horizontal. `body` tem `min-width: 320px` e
`overflow-x: hidden`.

## Áreas seguras

`viewport-fit=cover` e `env(safe-area-inset-*)` em cabeçalhos, folhas, barra inferior
e banners. A navegação inferior reserva
`calc(6.75rem + env(safe-area-inset-bottom))` para não colidir com o indicador de casa.

## Altura

Nunca `100vh`. Usamos `100dvh` / `min-h-dvh` para que a barra do navegador a aparecer
e a desaparecer não corte conteúdo. O chat do agente usa `calc(100dvh - ...)`.

## Teclado

Nos formulários de valor, criação de plano, compromisso, lembrete e no compositor do
agente: o campo ativo mantém-se visível, a ação principal continua alcançável e o
conteúdo não salta. As folhas têm `max-h-[92dvh]` com deslocação interna.

## Alvos de toque

Botões e linhas de lista importantes com altura mínima de 44 px (`min-h-11` / `min-h-12`).
Nada importante depende de `hover`.

## Navegação

Arquitetura aprovada, sem concorrência: **Início · Planos · + · Agente · Eu**.
O «+» abre uma folha inferior: Entrada, Despesa, Transferência, Guardar; e, em lista,
Criar plano, Adicionar compromisso, Criar lembrete, Ajustar saldo.

## Folhas vs ecrãs

Ação curta → folha inferior (`NativeSheet`). Fluxo complexo → rota de ecrã inteiro.

## Formulários

`inputMode="decimal"` para dinheiro, `type="email"`, `type="tel"`, controlos nativos de
data/hora. Erros junto ao campo.

## Acessibilidade

Rótulos em todos os controlos por ícone, estados de foco visíveis, contraste conforme
os tokens do tema, respeito por `prefers-reduced-motion`, e texto que aguenta escala
maior sem cortar.

## Desempenho

Listas longas (Atividade, Notificações, Conversas) mostram blocos e crescem a pedido.
Movimento contido. Ícones da app otimizados e servidos de `public/icons`.
