import "dotenv/config";
import { processCampaign } from "./campaign-agent";
import { supabaseClient } from "../lib/supabase";

const TEST_CAMPAIGNS = [
  {
    label: "Campanha CRÍTICA — gasto alto sem nenhuma conversão",
    input: {
      name: "Black Friday — Meta Ads",
      platform: "meta" as const,
      budget: 50,
      spend: 480,
      impressions: 12000,
      clicks: 55,
      conversions: 0,
    },
  },
  {
    label: "Campanha com ATENÇÃO — CTR baixo e CPC alto",
    input: {
      name: "Geração de Leads — Google Ads",
      platform: "google" as const,
      budget: 200,
      spend: 1500,
      impressions: 20000,
      clicks: 100,
      conversions: 3,
    },
  },
  {
    label: "Campanha SAUDÁVEL — boas métricas em todos os indicadores",
    input: {
      name: "Remarketing Instagram",
      platform: "meta" as const,
      budget: 100,
      spend: 500,
      impressions: 50000,
      clicks: 2000,
      conversions: 100,
    },
  },
];

async function run() {
  const { data: client, error: clientError } = await supabaseClient
    .from("clients")
    .insert({ name: "Cliente Teste — campaign-agent", segment: "teste" })
    .select()
    .single();

  if (clientError || !client) {
    console.error("Erro ao criar cliente de teste:", clientError);
    process.exit(1);
  }

  console.log(`\nCliente de teste criado: ${client.id}`);
  console.log("=".repeat(64));

  for (const { label, input } of TEST_CAMPAIGNS) {
    console.log(`\n[ ${label} ]`);
    console.log("-".repeat(64));

    const result = await processCampaign({ client_id: client.id, ...input });
    const { metricas: m, diagnostico: d } = result;

    console.log(`Status:           ${d.status.toUpperCase()}`);
    console.log(`CTR:              ${m.ctr.toFixed(2)}%`);
    console.log(`CPC:              R$ ${m.cpc.toFixed(2)}`);
    console.log(`CPL:              ${m.cpl > 0 ? `R$ ${m.cpl.toFixed(2)}` : "N/A"}`);
    console.log(`ROAS:             ${m.roas.toFixed(2)}x`);
    console.log(`Taxa conversao:   ${m.taxa_conversao.toFixed(2)}%`);

    if (d.problemas.length > 0) {
      console.log(`\nProblemas:`);
      d.problemas.forEach((p) => console.log(`  • ${p}`));
    }

    if (d.recomendacoes.length > 0) {
      console.log(`\nRecomendacoes:`);
      d.recomendacoes.forEach((r) => console.log(`  → ${r}`));
    }

    console.log(`\nResumo: ${d.resumo}`);
    console.log(`Campaign ID: ${result.campaign.id}`);
  }

  console.log("\n" + "=".repeat(64));
  console.log("Teste concluido! 3 campanhas inseridas no Supabase.");
}

run().catch((err) => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
