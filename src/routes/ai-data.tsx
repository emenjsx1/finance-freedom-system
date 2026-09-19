import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, Placeholder, Section } from "@/components/legal/legal-page";

export const Route = createFileRoute("/ai-data")({
  head: () => ({
    meta: [
      { title: "IA e os teus dados — Norte" },
      {
        name: "description",
        content: "O que o Agente vê, o que memoriza e como apagas tudo isso quando quiseres.",
      },
      { property: "og:title", content: "IA e os teus dados — Norte" },
      { property: "og:description", content: "Transparência sobre o Agente da Norte" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiDataPage,
});

function AiDataPage() {
  return (
    <LegalPage title="IA e os teus dados" updated="fevereiro de 2026">
      <p>
        O Agente é um ajudante de conversa. Explicamos aqui, em linguagem simples, o que ele vê e o
        que nunca faz.
      </p>

      <Section title="A que dados o Agente acede">
        <p>
          Apenas ao necessário para responder: o resumo do teu dinheiro (total, disponível, reservado),
          as tuas contas, movimentos recentes, gastos por categoria, os teus objetivos e a memória que
          autorizaste. Não enviamos a tua base de dados inteira em cada pergunta.
        </p>
      </Section>

      <Section title="Quem faz as contas">
        <p>
          O motor da aplicação calcula todos os valores. O Agente apenas explica esses números. Nunca
          inventa saldos nem os deduz do histórico da conversa.
        </p>
      </Section>

      <Section title="Memória">
        <p>
          A memória são notas curtas e estruturadas sobre ti (planos, preferências, contexto de
          trabalho ou família). Podes ver, editar e apagar cada uma em Perfil → Agente → Memória. Não
          existem memórias invisíveis.
        </p>
      </Section>

      <Section title="Imagens e comprovativos">
        <p>
          Se enviares uma fotografia de um recibo, a imagem pode ser enviada ao fornecedor de IA para
          leitura. Os valores lidos são apenas uma sugestão: nada é registado sem tu confirmares.
        </p>
      </Section>

      <Section title="Ações financeiras">
        <p>
          O Agente prepara a ação e mostra-te o antes e o depois. Só depois de tocares em Confirmar é
          que o movimento é registado.
        </p>
      </Section>

      <Section title="Fornecedor">
        <p>
          Fornecedor de IA em utilização: <Placeholder>fornecedor e modelo</Placeholder>. Se o serviço
          estiver indisponível, a aplicação continua a funcionar normalmente — só o Agente fica em
          pausa.
        </p>
      </Section>

      <Section title="Apagar">
        <p>
          Podes apagar conversas e memórias quando quiseres, sem afetar os teus registos financeiros.
        </p>
      </Section>
    </LegalPage>
  );
}
