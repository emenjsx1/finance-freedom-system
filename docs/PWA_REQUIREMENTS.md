# PWA — aplicação web instalável

Esta fase é **web/PWA**. Não há código nativo, não há APNs, não há widgets do sistema.

## Marca centralizada

`src/lib/brand.ts` é a única fonte: `APP_NAME`, `APP_SHORT_NAME`, `APP_TAGLINE`,
`APP_DESCRIPTION`, `APP_ICON`, `THEME_COLOR`, `BACKGROUND_COLOR`, `APP_START_URL`,
`APP_SCOPE`. Nenhum componente escreve o nome da app à mão.

## Manifest

Gerado por `vite-plugin-pwa` a partir de `vite.config.ts`:

- `name`, `short_name`, `description`, `lang: pt-PT`
- `start_url: /app`, `scope: /`, `display: standalone`, `orientation: portrait`
- `theme_color` / `background_color` — tom quente do sistema
- ícones 192/512 normais e maskable, `apple-touch-icon`
- atalhos: Nova despesa, Nova entrada, Agente, Hoje

## Service worker

`generateSW` (Workbox) em `/sw.js`, `registerType: autoUpdate`,
`injectRegister: null` — o registo é feito apenas por `src/lib/pwa/register.ts`.

Regras de cache:

| Pedido | Política | Porquê |
| --- | --- | --- |
| Navegações HTML | NetworkFirst | nunca servir um ecrã antigo |
| JS/CSS/fontes/ícones com hash | CacheFirst | imutáveis |
| Supabase, `/_serverFn/*`, auth | **não é feito cache** | saldos, conversas e contexto pessoal nunca ficam em cache |

`push-sw.js` é importado pelo service worker e trata `push` e `notificationclick`.
Só abre caminhos internos validados (`/app...`); nunca segue URLs arbitrários do payload.

## Registo — onde NÃO corre

`serviceWorkerAllowed()` recusa em desenvolvimento, dentro de iframe, em domínios de
pré-visualização e quando o URL tem `?sw=off`. Nesses casos desregista o que existir.

## Instalação

- Android/desktop: `beforeinstallprompt` guardado; o botão só aparece nas definições
  de notificações e no contexto certo — nunca na primeira visita.
- iOS: não existe API. Mostramos a instrução real (Partilhar › Adicionar ao ecrã
  principal) e nunca dizemos que a instalação foi feita.
- `standalone` detetado por `display-mode: standalone` e `navigator.standalone`.

## Atualizações

`autoUpdate` prepara a nova versão; a app mostra uma vez «Nova versão disponível.»
com [Atualizar]. Não interrompe repetidamente nem recarrega sozinha a meio de um formulário.

## Offline

Offline mostra o estado real: barra «Sem ligação». Nenhuma escrita financeira é
colocada em fila nem dada como concluída. Não há funcionalidade financeira falsa offline.

## Limitações conhecidas

- iOS Safari só permite Web Push em apps adicionadas ao ecrã principal (16.4+).
- Navegadores sem Push API: as notificações existem na app, sem entrega externa.
- A entrega agendada depende de infraestrutura de servidor ainda não ligada
  (ver NOTIFICATION_SYSTEM.md › Scheduler).
