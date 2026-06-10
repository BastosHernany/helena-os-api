// TODO: substituir analyzeLocally pela Anthropic API em produção
import "dotenv/config";
import { supabaseClient } from "../lib/supabase";
import { NovaCampanha, Metricas, Diagnostico, CampaignAgentResult } from "./interfaces/campaign.interface";


const DEFAULT_TICKET_MEDIO = 500;



function calcularMetricas(input: NovaCampanha): Metricas {
  const ticket = input.ticket_medio ?? DEFAULT_TICKET_MEDIO;
  return {
    ctr: input.impressions > 0 ? (input.clicks / input.impressions) * 100 : 0,
    cpc: input.clicks > 0 ? input.spend / input.clicks : 0,
    cpl: input.conversions > 0 ? input.spend / input.conversions : 0,
    roas: input.spend > 0 ? (input.conversions * ticket) / input.spend : 0,
    taxa_conversao: input.clicks > 0 ? (input.conversions / input.clicks) * 100 : 0,
  };
}

function analyzeLocally(input: NovaCampanha, m: Metricas): Diagnostico {
  const problemas: string[] = [];
  const criticos: string[] = [];
  const recomendacoes: string[] = [];
  const pontosPositivos: string[] = [];

  if (m.ctr < 1) {
    problemas.push("CTR baixo — anúncio não está atraindo cliques");
    recomendacoes.push("Poucas pessoas estão clicando no seu anúncio. Tente trocar a imagem ou o texto por algo que mostre claramente o resultado do seu produto ou serviço.");
  } else if (m.ctr >= 3) {
    pontosPositivos.push(`CTR de ${m.ctr.toFixed(1)}% está excelente`);
  }

  if (m.cpc > 10) {
    problemas.push("CPC alto — cada clique está custando muito");
    recomendacoes.push("Cada visita ao seu site está saindo cara. Revise para quem o anúncio está sendo mostrado — talvez esteja alcançando pessoas fora do seu público ideal.");
  }

  if (input.clicks > 0) {
    if (m.taxa_conversao < 2) {
      problemas.push("Taxa de conversão baixa — página de destino pode estar afastando leads");
      recomendacoes.push("As pessoas clicam mas não entram em contato. Verifique se a página de destino deixa claro o que o cliente deve fazer, como ligar, preencher um formulário ou mandar mensagem.");
    } else if (m.taxa_conversao >= 5) {
      pontosPositivos.push(`taxa de conversão de ${m.taxa_conversao.toFixed(1)}% está acima da média`);
    }
  }

  if (input.conversions === 0 && input.spend > 100) {
    criticos.push("Gastando dinheiro sem nenhuma conversão");
    recomendacoes.push("Essa campanha está gastando dinheiro sem trazer nenhum cliente. Pause agora e vamos entender o que está afastando as pessoas antes de investir mais.");
  } else if (input.spend > 0 && m.roas < 1) {
    criticos.push("ROAS negativo — campanha está dando prejuízo");
    recomendacoes.push("Essa campanha está custando mais do que está trazendo de volta. Pause agora e revise a oferta, o público e a página de destino antes de continuar investindo.");
  } else if (m.roas >= 3) {
    pontosPositivos.push(`ROAS de ${m.roas.toFixed(1)}x indica retorno positivo`);
  }

  const todosproblemas = [...criticos, ...problemas];

  let status: "saudavel" | "atencao" | "critico";
  if (criticos.length > 0) {
    status = "critico";
  } else if (problemas.length > 0) {
    status = "atencao";
  } else {
    status = "saudavel";
  }

  let resumo: string;
  if (status === "critico") {
    resumo = `A campanha "${input.name}" está em estado crítico. ${criticos.join(" ")}. Ação imediata necessária para evitar desperdício de orçamento.`;
  } else if (status === "atencao") {
    resumo = `A campanha "${input.name}" precisa de atenção. Foram identificados ${problemas.length} ponto(s) de melhoria: ${problemas.join("; ")}. Com os ajustes certos, há potencial de melhora significativa nos resultados.`;
  } else {
    const positivos = pontosPositivos.length > 0
      ? ` Destaques: ${pontosPositivos.join(", ")}.`
      : "";
    resumo = `A campanha "${input.name}" está saudável e performando bem.${positivos} Continue monitorando as métricas para manter o desempenho.`;
  }

  return { status, problemas: todosproblemas, recomendacoes, resumo };
}

export async function processCampaign(input: NovaCampanha): Promise<CampaignAgentResult> {
  const metricas = calcularMetricas(input);
  const diagnostico = analyzeLocally(input, metricas);

  const { data: campaign, error } = await supabaseClient
    .from("campaigns")
    .insert({
      client_id: input.client_id,
      name: input.name,
      platform: input.platform,
      status: "active",
      budget: input.budget ?? null,
      spend: input.spend,
      impressions: input.impressions,
      clicks: input.clicks,
      conversions: input.conversions,
      roas: metricas.roas,
      ctr: metricas.ctr,
      cpc: metricas.cpc,
      cpl: metricas.cpl,
      taxa_conversao: metricas.taxa_conversao,
      diagnostico_status: diagnostico.status,
      diagnostico_problemas: diagnostico.problemas,
      diagnostico_recomendacoes: diagnostico.recomendacoes,
      diagnostico_resumo: diagnostico.resumo,
    })
    .select()
    .single();

  if (error || !campaign) {
    throw new Error(`Erro ao salvar campanha no Supabase: ${error?.message}`);
  }

  return { campaign, metricas, diagnostico };
}
