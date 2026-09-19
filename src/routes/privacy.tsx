import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, Placeholder, Section } from "@/components/legal/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Norte" },
      {
        name: "description",
        content: "Que dados a Norte recolhe, porquê, como são usados e como os podes apagar.",
      },
      { property: "og:title", content: "Política de Privacidade — Norte" },
      { property: "og:description", content: "Como tratamos os teus dados financeiros e pessoais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updated="fevereiro de 2026">
      <p>
        Esta política descreve o funcionamento real da aplicação Norte Não descreve funcionalidades
        que ainda não existem.
      </p>

      <Section title="Quem trata os teus dados">
        <p>
          Responsável pelo tratamento: <Placeholder>nome legal da entidade</Placeholder>, com sede em{" "}
          <Placeholder>morada</Placeholder>. Contacto: <Placeholder>email de privacidade</Placeholder>.
        </p>
      </Section>

      <Section title="Informação que recolhemos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Conta: email e, se os indicares, nome preferido e nome completo.</li>
          <li>
            Identificador do método de acesso (email e palavra-passe, Apple ou Google). Não guardamos
            a tua palavra-passe nem os tokens dos fornecedores no teu perfil.
          </li>
          <li>Preferências: idioma, moeda base, fuso horário, aparência e definições da aplicação.</li>
          <li>
            Dados financeiros que registas: contas, movimentos, propósitos, reservas e objetivos.
          </li>
          <li>Ficheiros que carregas: comprovativos, faturas e fotografia de perfil.</li>
          <li>Conversas com o Agente e a memória que autorizas guardar.</li>
          <li>Registos técnicos mínimos de erros, sem conteúdo sensível.</li>
        </ul>
      </Section>

      <Section title="Para que usamos a informação">
        <p>
          Para te autenticar, calcular e mostrar a tua posição financeira, guardar comprovativos,
          responder através do Agente, enviar lembretes que ativaste e corrigir falhas técnicas. Não
          vendemos dados e não fazemos publicidade com base neles.
        </p>
      </Section>

      <Section title="Processamento por inteligência artificial">
        <p>
          Quando falas com o Agente, o texto da conversa, um resumo dos números calculados pela
          aplicação e as imagens que envias podem ser enviados ao fornecedor de IA configurado para
          gerar a resposta. Nenhuma ação financeira é executada sem a tua confirmação explícita.
        </p>
      </Section>

      <Section title="Subcontratantes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Alojamento, base de dados, autenticação e armazenamento de ficheiros: Supabase.</li>
          <li>Fornecedor de IA para as respostas do Agente: <Placeholder>fornecedor</Placeholder>.</li>
          <li>Início de sessão com Apple e Google, quando escolhes esses métodos.</li>
        </ul>
      </Section>

      <Section title="Partilha">
        <p>
          Não partilhamos os teus dados com terceiros para fins próprios deles. Podemos divulgar
          informação se a lei o exigir.
        </p>
      </Section>

      <Section title="Segurança">
        <p>
          Os dados são isolados por utilizador ao nível da base de dados. Os comprovativos e as
          fotografias de perfil ficam em armazenamento privado e só são acessíveis através de
          ligações temporárias emitidas para a tua sessão.
        </p>
      </Section>

      <Section title="Conservação e eliminação">
        <p>
          Guardamos os dados enquanto a conta existir. Podes apagar comprovativos, conversas e
          memórias do Agente a qualquer momento. Ao eliminar a conta em Perfil → Privacidade e dados,
          apagamos o teu perfil e a conta de autenticação.
        </p>
      </Section>

      <Section title="Os teus direitos">
        <p>
          Podes aceder, corrigir, exportar e eliminar os teus dados dentro da aplicação, ou
          contactar-nos em <Placeholder>email de privacidade</Placeholder>.
        </p>
      </Section>
    </LegalPage>
  );
}
