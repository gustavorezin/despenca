"use server";

import { redirect } from "next/navigation";
import { getSessao } from "@/shared/auth/sessao";
import { criarCasa } from "@/modules/casa/services/criarCasa";
import { atualizarNomeUsuario } from "@/modules/usuario/services/atualizarNomeUsuario";

/**
 * Conclui o onboarding (ADR-009): grava o nome do usuário (quando informado),
 * cria a Casa e segue para a Lista ou direto ao registro da primeira Compra.
 * Com sessão "database", o próximo request já resolve a `casaId` no callback.
 */
export async function criarCasaAction(
  nomeUsuario: string,
  nomeCasa: string,
  irRegistrar: boolean,
) {
  const sessao = await getSessao();
  if (!sessao?.usuarioId) redirect("/login");

  // Nome vazio — ex.: "Pular" no login por email — não grava nada; o usuário
  // pode informar depois na tela de Conta.
  const nome = nomeUsuario.trim();
  if (nome) {
    await atualizarNomeUsuario({ usuarioId: sessao.usuarioId, nome });
  }

  await criarCasa({ usuarioId: sessao.usuarioId, nome: nomeCasa });
  redirect(irRegistrar ? "/registrar" : "/lista");
}
