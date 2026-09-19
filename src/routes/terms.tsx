import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, Placeholder, Section } from "@/components/legal/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de Utilização — Finan." },
      { name: "description", content: "As condições de utilização da aplicação Finan." },
      { property: "og:title", content: "Termos de Utilização — Finan." },
      { property: "og:description", content: "Condições de utilização, limites e responsabilidades." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Termos de Utilização" updated="fevereiro de 2026">
      <Section title="Conta">
        <p>
          Precisas de uma conta para usar a aplicação. És responsável por manter o acesso seguro e por
          manter a informação de contacto atualizada.
        </p>
      </Section>

      <Section title="Utilização aceitável">
        <p>
          Não podes usar a aplicação para fins ilícitos, tentar aceder a dados de outras pessoas nem
          interferir com o funcionamento do serviço.
        </p>
      </Section>

      <Section title="A informação é tua">
        <p>
          Os registos financeiros são introduzidos por ti. Não nos ligamos a bancos nem verificamos os
          valores que introduzes.
        </p>
      </Section>

      <Section title="Limites da inteligência artificial">
        <p>
          O Agente pode errar ao interpretar texto, imagens ou intenções. Os cálculos financeiros são
          feitos pelo motor determinístico da aplicação, não pelo modelo, e qualquer alteração ao teu
          dinheiro exige a tua confirmação.
        </p>
      </Section>

      <Section title="Não é aconselhamento financeiro">
        <p>
          A aplicação é uma ferramenta de organização pessoal. Não presta aconselhamento financeiro,
          fiscal ou de investimento.
        </p>
      </Section>

      <Section title="Disponibilidade">
        <p>
          Procuramos manter o serviço disponível, mas pode haver interrupções para manutenção ou por
          motivos fora do nosso controlo.
        </p>
      </Section>

      <Section title="Propriedade intelectual">
        <p>A marca, o design e o código da aplicação pertencem a <Placeholder>entidade legal</Placeholder>.</p>
      </Section>

      <Section title="Cessação">
        <p>
          Podes eliminar a conta a qualquer momento dentro da aplicação. Podemos suspender contas que
          violem estes termos.
        </p>
      </Section>

      <Section title="Alterações e lei aplicável">
        <p>
          Avisamos na aplicação quando estes termos mudarem. Lei aplicável e foro:{" "}
          <Placeholder>jurisdição</Placeholder>. Contacto: <Placeholder>email de contacto</Placeholder>.
        </p>
      </Section>
    </LegalPage>
  );
}
