import { dataDeISOLocal, dataISOLocal } from "@/shared/utils/data";

/**
 * Resolve o cabeçalho da Compra a partir da entrada já validada: descrição
 * vazia vira null, data futura é proibida (ADR-021). A comparação de futuro é
 * por dia de calendário no fuso da Casa ("YYYY-MM-DD" ordena lexicamente).
 *
 * Compra datada de hoje (ou sem data) guarda o **instante real** do registro —
 * é o que preserva a ordem entre eventos do mesmo dia: um "Acabou" marcado
 * antes do registro não atropela a Compra, e vice-versa (ADR-013). Retroativa
 * vale meio-dia UTC do dia informado.
 */
export function resolverCabecalho(
  entrada: { descricao?: string; data?: string },
  hoje = new Date(),
): { descricao: string | null; data: Date } {
  const hojeISO = dataISOLocal(hoje);
  if (entrada.data && entrada.data > hojeISO) {
    throw new Error("A data da Compra não pode ser no futuro.");
  }
  return {
    descricao: entrada.descricao ? entrada.descricao : null,
    data:
      entrada.data && entrada.data !== hojeISO
        ? dataDeISOLocal(entrada.data)
        : hoje,
  };
}
