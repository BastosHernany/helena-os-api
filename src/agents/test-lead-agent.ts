import "dotenv/config";
import { processLead } from "./lead-agent";
import { supabaseClient } from "../lib/supabase";

// Lead A: indicacao + muito interesse => perfil alto + interesse alto => followup_imediato
// Lead B: instagram + pouco interesse => perfil baixo + interesse baixo => monitorar
// Lead C: site + considerando => perfil medio + interesse medio => nutricao_leve
// Lead D: whatsapp + urgente quer contratar => perfil medio + interesse alto => followup_rapido
const TEST_LEADS = [
  {
    label: "Lead A — indicacao + muito interesse (perfil alto + interesse alto)",
    input: {
      nome: "Carlos Souza",
      email: "carlos@empresa.com.br",
      telefone: "11999887766",
      source: "indicacao" as const,
      observacoes: "Preciso urgente de um sistema de CRM, quanto custa o plano mensal? Quero contratar essa semana.",
    },
  },
  {
    label: "Lead B — instagram + pouco interesse (perfil baixo + interesse baixo)",
    input: {
      nome: "João Pereira",
      email: null,
      telefone: null,
      source: "instagram" as const,
      observacoes: null,
    },
  },
  {
    label: "Lead C — site + considerando (perfil medio + interesse medio)",
    input: {
      nome: "Ana Lima",
      email: "ana.lima@gmail.com",
      telefone: null,
      source: "site" as const,
      observacoes: "Estou pesquisando e avaliando opções de automação de marketing para minha empresa.",
    },
  },
  {
    label: "Lead D — whatsapp + urgente quer contratar (perfil medio + interesse alto)",
    input: {
      nome: "Fernanda Costa",
      email: null,
      telefone: "21988776655",
      source: "whatsapp" as const,
      observacoes: "Preciso urgente! Quero contratar hoje, me passa o orçamento por favor.",
    },
  },
];

async function run() {
  const { data: client, error: clientError } = await supabaseClient
    .from("clients")
    .insert({ name: "Cliente Teste — lead-agent v2", segment: "teste" })
    .select()
    .single();

  if (clientError || !client) {
    console.error("Erro ao criar cliente de teste:", clientError);
    process.exit(1);
  }

  console.log(`\nCliente de teste criado: ${client.id}`);
  console.log("=".repeat(72));

  for (const { label, input } of TEST_LEADS) {
    console.log(`\n[ ${label} ]`);
    console.log("-".repeat(72));

    const result = await processLead({ cliente_id: client.id, ...input });

    console.log(`Score geral:      ${result.lead.score}/100`);
    console.log(`Score perfil:     ${result.lead.score_perfil}/100`);
    console.log(`Score interesse:  ${result.lead.score_interesse}/100`);
    console.log(`Estagio funil:    ${result.lead.estagio_funil}`);
    console.log(`Status:           ${result.lead.status}`);
    console.log(`Acao:             ${result.action}`);
    console.log(`Raciocinio:       ${result.reasoning}`);
    console.log(`Lead ID:          ${result.lead.id}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log("Teste concluido! 4 leads inseridos no Supabase.");
}

run().catch((err) => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
