import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, Placeholder, Section } from "@/components/legal/legal-page";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Apoio — Finan." },
      { name: "description", content: "Perguntas frequentes e como falar connosco." },
      { property: "og:title", content: "Apoio — Finan." },
      { property: "og:description", content: "Ajuda com acesso, dados e privacidade na Finan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <LegalPage title="Apoio" updated="fevereiro de 2026">
      <Section title="Falar connosco">
        <p>
          Escreve para <Placeholder>email de apoio</Placeholder>. Respondemos em dias úteis.
        </p>
      </Section>

      <Section title="Não consigo entrar">
        <p>
          Se usas email e palavra-passe, toca em "Esqueceste a palavra-passe?" no ecrã de entrada e
          segue as instruções enviadas. Se criaste a conta com a Apple ou a Google, entra pelo mesmo
          método — é a mesma conta.
        </p>
      </Section>

      <Section title="Entrei com a Apple e escondi o meu email">
        <p>
          Funciona normalmente. Recebes tudo no endereço privado que a Apple criou para ti. Podes
          adicionar depois um método de email e palavra-passe em Perfil → Acesso e segurança.
        </p>
      </Section>

      <Section title="Os meus números não batem certo">
        <p>
          A aplicação verifica sozinha se o total corresponde ao disponível mais o reservado. Se
          houver algo estranho, aparece um aviso na página inicial com um caminho para corrigir, sem
          apagar histórico.
        </p>
      </Section>

      <Section title="Privacidade e dados">
        <p>
          Podes exportar tudo, apagar comprovativos, apagar as conversas e a memória do Agente e
          eliminar a conta em Perfil → Privacidade e dados.
        </p>
      </Section>
    </LegalPage>
  );
}
