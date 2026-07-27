/*
  Datas de calendário do app — sempre no fuso da Casa, fixo em
  America/Sao_Paulo no F0/F1 (produto brasileiro; multi-morador F5 pode levar
  o fuso para a Casa). Sem fuso explícito, o servidor (UTC na Vercel) viraria
  o dia às 21h de Brasília: "Hoje" viraria "Ontem" e a trava de data futura
  (ADR-021) deslocaria um dia.
*/

const FUSO_CASA = "America/Sao_Paulo";

/** Data no fuso da Casa como "YYYY-MM-DD" (o locale en-CA já emite ISO). */
export function dataISOLocal(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_CASA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Constrói a data ao meio-dia UTC — o mesmo dia de calendário em qualquer
 * fuso de −11h a +11h, imune a shift na serialização e ao fuso do servidor.
 */
export function dataDeISOLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
}

/** Rótulo amigável e doméstico para a data de uma Compra (spec-design §8). */
export function rotularDataCompra(data: Date, hoje = new Date()): string {
  // Dias de calendário no fuso da Casa: compara os dias ISO como instantes UTC.
  const meiaNoiteUTC = (d: Date) => Date.parse(`${dataISOLocal(d)}T00:00:00Z`);
  const dias = Math.round((meiaNoiteUTC(hoje) - meiaNoiteUTC(data)) / 86_400_000);

  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7) return `Há ${dias} dias`;

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_CASA,
    day: "2-digit",
    month: "short",
  }).format(data);
}
