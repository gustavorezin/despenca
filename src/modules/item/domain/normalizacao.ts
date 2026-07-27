/*
  Normalização simples de nome de Item (ADR-005): o texto digitado vira o
  nomeCanonico da Casa. Na F3 (OCR/LLM) esta regra evolui sem mudar quem chama.
*/

/** Colapsa espaços e capitaliza a 1ª letra ("  leite  em pó " → "Leite em pó"). */
export function normalizarNome(bruto: string): string {
  const limpo = bruto.trim().replace(/\s+/g, " ");
  if (!limpo) return limpo;
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}
