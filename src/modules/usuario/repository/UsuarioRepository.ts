import { prisma } from "@/lib/prisma";

/*
  Acesso a dados de perfil do Usuario (modelo `User` — contrato do Auth.js,
  ver schema.prisma). Único lugar do módulo que conhece Prisma (§2.4).
*/
export const UsuarioRepository = {
  async atualizarNome({
    usuarioId,
    nome,
  }: {
    usuarioId: string;
    nome: string;
  }) {
    await prisma.user.update({
      where: { id: usuarioId },
      data: { name: nome },
      select: { id: true },
    });
  },
};
