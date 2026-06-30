// Responsável por ler arquivos Excel exportados do Meta Ads ou Google Ads
// e extrair as métricas necessárias para o agente de campanhas.
import ExcelJS from "exceljs";
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

// ── Extrai o valor "cru" de uma célula do exceljs ────────────────────────────
// exceljs pode retornar number, string, Date, ou objetos (fórmula, rich text)
// dependendo do tipo de célula. Normalizamos para number | string.

function valorCelula(valor: ExcelJS.CellValue): unknown {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object") {
    if ("result" in valor) return valor.result ?? "";
    if ("richText" in valor) return valor.richText.map((parte) => parte.text).join("");
    if ("text" in valor) return valor.text;
  }
  return valor;
}

// ── Lê e processa o buffer do arquivo Excel ──────────────────────────────────

export async function processarExcel(
  buffer: Buffer,
  plataforma: "meta" | "google",
  ticketMedio?: number
): Promise<ResultadoExcel> {
  const workbook = new ExcelJS.Workbook();
  // exceljs traz @types/node@14 via fast-csv, cujo tipo Buffer conflita
  // estruturalmente com o @types/node do projeto — cast necessário.
  await workbook.xlsx.load(buffer as any);
  const planilha = workbook.worksheets[0];

  if (!planilha) {
    throw new Error("Planilha vazia ou sem dados reconhecíveis");
  }

  const cabecalhos: string[] = [];
  planilha.getRow(1).eachCell({ includeEmpty: true }, (celula, numeroColuna) => {
    cabecalhos[numeroColuna] = String(valorCelula(celula.value)).trim();
  });

  const linhas: Record<string, unknown>[] = [];
  planilha.eachRow((linha, numeroLinha) => {
    if (numeroLinha === 1) return;

    const dadosLinha: Record<string, unknown> = {};
    linha.eachCell({ includeEmpty: true }, (celula, numeroColuna) => {
      const cabecalho = cabecalhos[numeroColuna];
      if (cabecalho) dadosLinha[cabecalho] = valorCelula(celula.value);
    });
    linhas.push(dadosLinha);
  });

  if (linhas.length === 0) {
    throw new Error("Planilha vazia ou sem dados reconhecíveis");
  }

  const mapeamento = plataforma === "meta" ? COLUNAS_META : COLUNAS_GOOGLE;
  const campanhas: Omit<NovaCampanha, "client_id">[] = [];
  const avisos: string[] = [];

  for (const [indice, linha] of linhas.entries()) {
    const dados: DadosBrutosExcel = {};

    // Normaliza cada coluna da linha para o campo interno correspondente
    for (const [colunaOriginal, valorBruto] of Object.entries(linha)) {
      const campoInterno = mapeamento[colunaOriginal.toLowerCase().trim()];
      if (!campoInterno) continue;

      if (campoInterno === "nome") {
        dados.nome = String(valorBruto).trim();
      } else {
        (dados as Record<string, number>)[campoInterno] = paraNumero(valorBruto);
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
