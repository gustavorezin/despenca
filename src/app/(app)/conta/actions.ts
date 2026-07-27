"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirCasa, getSessao } from "@/shared/auth/sessao";
import { renomearCasa } from "@/modules/casa/services/renomearCasa";
import { atualizarNomeUsuario } from "@/modules/usuario/services/atualizarNomeUsuario";

/** Atualiza o nome do usuário logado (tela de Conta). */
export async function atualizarNomeUsuarioAction(nome: string) {
  const sessao = await getSessao();
  if (!sessao?.usuarioId) redirect("/login");

  await atualizarNomeUsuario({ usuarioId: sessao.usuarioId, nome });

  // Sessão "database": o card lê User do banco a cada request.
  revalidatePath("/conta");
}

/** Atualiza o nome da Casa ativa (tela de Conta). */
export async function atualizarNomeCasaAction(nome: string) {
  const { casaId } = await exigirCasa();
  await renomearCasa({ casaId, nome });
  revalidatePath("/conta");
}
