import { z } from "zod";
import { UsuarioRepository } from "@/modules/usuario/repository/UsuarioRepository";

// Nome exibido no perfil e na saudação da Lista. Gravação explícita: exige um
// nome não-vazio — quem não informa (ex.: "Pular" no onboarding) não grava.
const schema = z.object({
  usuarioId: z.string().min(1),
  nome: z.string().trim().min(1, "Informe seu nome.").max(40, "Nome muito longo."),
});

/** Caso de uso: atualizar o nome do usuário (Conta e onboarding). */
export async function atualizarNomeUsuario(entrada: {
  usuarioId: string;
  nome: string;
}) {
  const { usuarioId, nome } = schema.parse(entrada);
  await UsuarioRepository.atualizarNome({ usuarioId, nome });
}
