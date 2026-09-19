# IOS_NATIVE_REQUIREMENTS

iPhone-first. Each item lists what the web build does today and what the native package
must provide later.

| Capability | Today | Native requirement |
| --- | --- | --- |
| Sign in with Apple | OAuth through the auth provider | Native ASAuthorization, Apple review requirement when other social logins exist |
| Face ID / Touch ID | App lock preference only | LocalAuthentication, only prompted when the person enables app lock |
| Camera | File input | Just-in-time permission on "Tirar foto", never at launch |
| Photo picker | File input | PHPicker, no full library permission |
| File picker | File input | UIDocumentPicker |
| Push notifications | In-app notification center | Permission requested only after the value is explained |
| Haptics | Web vibration where available | UIFeedbackGenerator on confirm, success and error |
| Deep links | Route URLs | Universal links to plan, activity and agent threads |
| Privacy screen | Not applicable | Blur balances in the app switcher |
| App lifecycle | Web hydration | Restore last route, refresh snapshot on foreground |
| Keyboard | Safe-area aware sheets, autofocus amount fields | Keyboard avoidance and decimal pad |
| Safe areas | `env(safe-area-inset-*)` throughout | Respect notch and home indicator |
| Accessibility | Semantic labels, contrast, reduced motion | Dynamic Type and VoiceOver pass on every screen |
| Dark mode | Intentionally adapted, never inverted | Match system appearance setting |

## Desenvolvimento pessoal — requisitos nativos

Widgets (a implementar e validar em Xcode; a web só define os contratos):
- HOJE: 1 a 3 próximas ações.
- DINHEIRO: Disponível/Reservado, com modo "valores escondidos" escolhido pela pessoa.
- PLANO: um plano fixado pela pessoa.
- FOCO: AGORA + próxima ação.
- PROGRAMA: dia atual + próxima ação.
Nenhum widget mostra texto de conversas ou reflexões.

Notificações: categorias Ações pessoais, Programas, Seguimentos do Agente, além das financeiras;
ações rápidas Marcar como feita, Remarcar, Ver; deep links para ação, programa, plano, compromisso, revisão e conversa.
Pré-visualizações sensíveis escondidas por defeito.

App Intents / Atalhos: registar despesa, registar receita, perguntar ao Agente, abrir Hoje, criar ação, abrir plano.
Live Activities só para sessões limitadas no tempo — nunca um painel permanente de património.

Privacidade nativa: Face ID, ecrã de privacidade no multitarefa, conteúdo sensível escondido em notificações.

Nada disto é dado como feito antes da fase nativa: a web modela UX e contratos, o comportamento real é validado no Xcode.
