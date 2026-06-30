// Responsável por ler arquivos Excel exportados do Meta Ads ou Google Ads
// e extrair as métricas necessárias para o agente de campanhas.
import * as XLSX from "xlsx";
import { NovaCampanha } from "./interfaces/campaign.interface";

// ── Mapeamento de colunas por plataforma ─────────────────────────────────────
// Cada plataforma exporta com nomes de coluna diferentes.
// Aqui normalizamos tudo para os campos internos.

const COLUNAS_META: Record<string, keyof DadosBrutosExcel> = {
  "nome da campanha":   "nome",
  "campaign name":      "nome",
  "valor usado":        "gasto",
  "amount spent":       "gasto",
  "impressões":         "impressoes",
  "impressions":        "impressoes",
  "cliques no link":    "cliques",
  "link clicks":        "cliques",
  "resultados":         "conversoes",
  "results":            "conversoes",
  "orçamento diário":   "orcamento",
  "daily budget":       "orcamento",
};

const COLUNAS_GOOGLE: Record<string, keyof DadosBrutosExcel> = {
  "campanha":           "nome",
  "campaign":           "nome",
  "custo":              "gasto",
  "cost":               "gasto",
  "impressões":         "impressoes",
  "impressions":        "impressoes",
  "cliques":            "cliques",
  "clicks":             "cliques",
  "conversões":         "conversoes",
  "conversions":        "conversoes",
  "orçamento":          "orcamento",
  "budget":             "orcamento",
};

interface DadosBrutosExcel {
  nome?:       string;
  gasto?:      number;
  impressoes?: number;
  cliques?:    number;
  conversoes?: number;
  orcamento?:  number;
}

export interface ResultadoExcel {
  campanhas: Omit<NovaCampanha, "client_id">[];
  avisos:    string[];
}

// ── Converte valor de célula para número ────────────────────────────────────

function paraNumero(valor: unknown): number {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    // Remove R$, vírgulas e espaços (padrão brasileiro e americano)
    const limpo = valor.replace(/[R$\s.]/g, "").replace(",", ".");
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// ── Lê e processa o buffer do arquivo Excel ──────────────────────────────────

export function processarExcel(
  buffer: Buffer,
  plataforma: "meta" | "google",
  ticketMedio?: number
): ResultadoExcel {
  const workbook   = XLSX.read(buffer, { type: "buffer" });
  const planilha   = workbook.Sheets[workbook.SheetNames[0]];
  const linhas     = XLSX.utils.sheet_to_json<Record<string, unknown>>(planilha, { defval: "" });

  if (linhas.length === 0) {
    throw new Error("Planilha vazia ou sem dados reconhecíveis");
  }

  const mapeamento = plataforma === "meta" ? COLUNAS_META : COLUNAS_GOOGLE;
  const campanhas: Omit<NovaCampanha, "client_id">[] = [];
  const avisos: string[] = [];

  for (const [indice, linha] of linhas.entries()) {
    const dados: DadosBrutosExcel = {};

    // Normaliza cada coluna da linha para o campo interno correspondente
    for (const [colunaOriginal, valorCelula] of Object.entries(linha)) {
      const campoInterno = mapeamento[colunaOriginal.toLowerCase().trim()];
      if (!campoInterno) continue;

      if (campoInterno === "nome") {
        dados.nome = String(valorCelula).trim();
      } else {
        (dados as Record<string, number>)[campoInterno] = paraNumero(valorCelula);
      }
    }

    // Ignora linhas sem nome ou sem dados de gasto
    if (!dados.nome) {
      avisos.push(`Linha ${indice + 2}: ignorada (sem nome de campanha)`);
      continue;
    }

    if (dados.gasto === undefined || dados.gasto === 0) {
      avisos.push(`Campanha "${dados.nome}": sem valor de gasto, pode distorcer métricas`);
    }

    campanhas.push({
      name:         dados.nome,
      platform:     plataforma,
      budget:       dados.orcamento ?? null,
      spend:        dados.gasto        ?? 0,
      impressions:  dados.impressoes   ?? 0,
      clicks:       dados.cliques      ?? 0,
      conversions:  dados.conversoes   ?? 0,
      ticket_medio: ticketMedio,
    });
  }

  if (campanhas.length === 0) {
    throw new Error(
      `Nenhuma campanha identificada. Verifique se o arquivo é um relatório de ${plataforma === "meta" ? "Meta Ads" : "Google Ads"} e se as colunas estão no formato padrão.`
    );
  }

  return { campanhas, avisos };
}
