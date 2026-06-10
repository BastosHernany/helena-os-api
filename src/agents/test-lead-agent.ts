import "dotenv/config";
import { processLead } from "./lead-agent";
import { supabaseClient } from "../lib/supabase";

const TEST_LEADS = [
  {
    label: "Lead QUENTE — indicacao + alta intenção + contato completo",
    input: {
      nome: "Carlos Souza",
      email: "carlos@empresa.com.br",
      telefone: "11999887766",
      source: "indicacao" as const,
      observacoes: "Preciso urgente de um sistema de CRM, quanto custa o plano mensal?",
    },
  },
  {
    label: "Lead MORNO — site + só tem email",
    input: {
      nome: "Ana Lima",
      email: "ana.lima@gmail.com",
      telefone: null,
      source: "site" as const,
      observacoes: "Veio pelo blog, interessada em automação de marketing",
    },
  },
  {
    label: "Lead FRIO — instagram + sem contato + sem anotações",
    input: {
      nome: "João Pereira",
      email: null,
      telefone: null,
      source: "instagram" as const,
      observacoes: null,
    },
  },
];

async function run() {
  const { data: client, error: clientError } = await supabaseClient
    .from("clients")
    .insert({ name: "Cliente Teste — lead-agent", segment: "teste" })
    .select()
    .single();

  if (clientError || !client) {
    console.error("Erro ao criar cliente de teste:", clientError);
    process.exit(1);
  }

  console.log(`\nCliente de teste criado: ${client.id}`);
  console.log("=".repeat(64));

  for (const { label, input } of TEST_LEADS) {
    console.log(`\n[ ${label} ]`);
    console.log("-".repeat(64));

    const result = await processLead({ cliente_id: client.id, ...input });

    console.log(`Score:          ${result.lead.score}/100`);
    console.log(`Status:         ${result.lead.status}`);
    console.log(`Acao:           ${result.action}`);
    console.log(`Raciocinio:     ${result.reasoning}`);
    console.log(`Acao sugerida:  ${result.suggested_action}`);
    console.log(`Lead ID:        ${result.lead.id}`);
  }

  console.log("\n" + "=".repeat(64));
  console.log("Teste concluido! 3 leads inseridos no Supabase.");
}

run().catch((err) => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
