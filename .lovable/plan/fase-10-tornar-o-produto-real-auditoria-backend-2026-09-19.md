# Fase 10 — Tornar o produto real (auditoria + backend)

## Auditoria do que existe hoje

**A funcionar**
- Motor financeiro único (`src/lib/finance/engine.ts`): saldos derivados dos movimentos, transferências e redistribuições não criam dinheiro, multi-moeda sem somas inválidas.
- Ecrãs: Home, Atividade (pesquisa, filtros, detalhe), Contas, Carteiras, Objetivos, Análise, Notificações, Automações, Definições, Perfil.
- Autenticação: email+palavra-passe, Google e Apple ligados; recuperar/redefinir/alterar palavra-passe; métodos de acesso; eliminar conta.
- Tabela `profiles` na nuvem com regras de acesso por utilizador.
- Agente: chama mesmo um modelo no servidor, com factos do motor; prepara ações, nunca executa.
- Saudação da Home contextual e determinística (sem IA ao abrir).

**Parcial**
- Perfil existe mas sem foto real (não há armazenamento de imagens).
- Reconciliação ("Verificar saldo") existe nas contas, falta em mais sítios.
- Notificações e automações correm só com a app aberta.

**Só interface / em falta**
- **Todo o dinheiro vive no dispositivo** (contas, movimentos, carteiras, objetivos, memórias do agente, notificações, preferências). Nada disto está na base de dados: mudar de telemóvel perde tudo, e não existem regras de acesso, atomicidade nem proteção contra duplicados.
- Sessões e dispositivos, foto de perfil, diagnóstico financeiro, tratamento central de erros, estados offline.

**Problema de integridade confirmado**
Total 0 / Disponível 2.000 / Reservado −2.000 acontece porque uma despesa (ou redistribuição) pode sair de uma carteira sem saldo. O motor soma corretamente — o que falta é impedir a operação inválida na origem.

---

## O que proponho fazer, por partes

### Parte A — Integridade financeira (agora)
- Impedir no domínio que uma carteira fique negativa: despesa, redistribuição e levantamento protegido passam a validar saldo antes de gravar, com mensagem clara e opção de escolher outra carteira.
- Função `checkIntegrity()` no motor: total = disponível + reservado, reservas negativas, alocações órfãs, referências em falta, moedas por converter.
- Ecrã de diagnóstico só em desenvolvimento (não visível a utilizadores).
- Home nunca mostra estado impossível: se a verificação falhar, mostra um aviso calmo com caminho de correção, sem inventar números.
- Caminho de reconciliação para dados já inválidos: ajuste auditável, sem apagar histórico.
- Esqueletos na Home enquanto o resumo carrega (sem piscar 0 MZN).

### Parte B — Passar o dinheiro para a nuvem (a maior peça)
Tabelas com regras de acesso por utilizador: contas, carteiras/regras, movimentos, alocações, recorrências, anexos, memórias do agente, notificações, automações, preferências. Dinheiro em inteiros, chaves estrangeiras, índices, sem apagar contas com histórico.
Operações críticas (despesa, transferência, reservar, libertar, contribuição, ajuste) passam a ser feitas no servidor, atómicas e com chave de idempotência — dois toques nunca criam dois movimentos.
Migração automática dos dados que já estão no dispositivo, com confirmação.

### Parte C — Atividade e desempenho reais
Atividade paginada e pesquisada na base de dados (sem carregar o histórico todo), Análise e Agente a ler do mesmo servidor.

### Parte D — Perfil, segurança e produção
Foto de perfil em armazenamento privado, dispositivos e sessões, memórias do agente visíveis e editáveis, erros traduzidos com registo técnico separado, validação de configuração, notificações e automações no servidor.

---

## Configuração externa que continuará a depender de ti
- Apple e Google: os fornecedores estão ligados do lado da app; credenciais próprias, se quiseres usá-las, são configuração externa.
- Envio de emails próprios e notificações push: ainda não têm fornecedor configurado.

---

## Sugestão
Faço a **Parte A** já, nesta resposta, e seguimos para a Parte B a seguir — é uma migração grande e vale a pena isolá-la.
