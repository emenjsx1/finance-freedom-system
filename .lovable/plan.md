# Autenticação obrigatória e experiência iPhone

## Objetivo
Garantir que nenhuma área com dados pessoais ou financeiros abre sem uma conta autenticada, e tornar entrada, criação de conta, configuração inicial e navegação principal confortáveis no iPhone 17 Pro.

## Alterações
- Proteger `/app` e todos os seus ecrãs com uma validação central de sessão antes de mostrar qualquer conteúdo.
- Proteger `/onboarding`; quem não iniciou sessão volta para `/auth` e quem já concluiu a configuração segue para a app.
- Encaminhar corretamente após criar conta ou entrar: configuração inicial para utilizadores novos, app para utilizadores já configurados.
- Manter públicas apenas entrada, criação de conta, recuperação de palavra-passe e páginas legais.
- Rever áreas seguras, teclado, altura dinâmica, navegação inferior, folhas e formulários para o tamanho do iPhone 17 Pro.
- Evitar flashes de dados privados durante a validação e apresentar um estado de carregamento limpo.

## Validação
- Confirmar que `/app`, páginas internas e `/onboarding` redirecionam sem sessão.
- Testar criação de conta, entrada e saída sem permitir regressar a conteúdo privado.
- Verificar os principais ecrãs no viewport do iPhone 17 Pro, incluindo teclado/formulários, scroll e navegação inferior.
- Executar os testes existentes e verificar erros visíveis no navegador.
