# App Store release checklist — Finan.

Internal. Nothing here is fabricated: items without a confirmed value are marked
`A DEFINIR` and must be supplied before submission.

| Item | Status | Value / note |
| --- | --- | --- |
| App name | A DEFINIR | Working name: "Finan." |
| Subtitle | A DEFINIR | Suggested: "O teu dinheiro, uma vida melhor." |
| Description | A DEFINIR | Must describe manual money tracking + AI assistant. |
| Keywords | A DEFINIR | |
| Primary category | A DEFINIR | Likely Finance |
| Age rating | A DEFINIR | No objectionable content; AI chat present |
| Privacy Policy URL | READY (route) | `/privacy` — public, no authentication. Needs production domain. |
| Support URL | READY (route) | `/support` — public, no authentication. Needs production domain + contact email. |
| App Privacy answers | READY (draft) | See `docs/app-privacy-inventory.md`. |
| Screenshots | MISSING | Required per device size. |
| App icon | PARTIAL | Logo exists (`src/assets/finan-logo.png`); icon asset set not produced. |
| Sign in with Apple | APP-SIDE READY / EXTERNAL CONFIG REQUIRED | Flow implemented; Apple Services ID, Key ID, Team ID and private key must be configured. |
| Account deletion in app | READY | Profile → Privacidade e dados → Eliminar conta (server function deletes profile + auth user). |
| Review notes | A DEFINIR | Explain that financial data is user-entered. |
| Demo / review account | PROCESS DEFINED | Provision a normal account with seeded sample data and hand the credentials to review via App Store Connect only. Never hardcode credentials in the client. |
| Push notifications | MISSING | In-app notifications work; APNs credentials and a native wrapper are required. |
| AI disclosure | READY | `/ai-data` explains model use, memory and confirmation-before-mutation. |
| Export compliance | A DEFINIR | Only standard HTTPS/TLS encryption is used. |
| In-app purchases | NOT APPLICABLE | No monetisation in this phase. |

## External configuration still required

- Apple OAuth credentials (Services ID, Key ID, Team ID, .p8 key).
- Google OAuth credentials for production redirect URLs.
- AI provider key (`LOVABLE_API_KEY`) in the production environment.
- Transactional email provider (verification, password reset) with a verified domain.
- Push notification credentials (APNs) once packaged natively.
- Legal entity name, address, privacy contact email, jurisdiction — currently
  marked `[a definir: …]` on `/privacy` and `/terms`.
