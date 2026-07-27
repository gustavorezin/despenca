import path from "node:path";
import { randomUUID } from "node:crypto";
import { config as carregarEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Mesma precedência de env do app (ver prisma.config.ts).
carregarEnv({ path: path.resolve(process.cwd(), ".env.local") });
carregarEnv({ path: path.resolve(process.cwd(), ".env") });

// Prisma fora do Next: mesmo driver adapter do app (ver src/lib/prisma.ts).
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

export type SessaoDeTeste = {
  sessionToken: string;
  usuarioId: string;
  casaId: string;
};

/**
 * Semeia usuário + Casa + Morador + Session direto no banco e devolve o
 * sessionToken. A sessão do Auth.js é "database": basta o cookie
 * `authjs.session-token` apontar para uma linha válida de Session.
 */
export async function criarSessaoDeTeste(): Promise<SessaoDeTeste> {
  const marca = Date.now();
  const usuario = await prisma.user.create({
    data: { name: "Camila E2E", email: `e2e-${marca}@teste.local` },
  });
  const casa = await prisma.casa.create({ data: { nome: `Casa E2E ${marca}` } });
  await prisma.morador.create({
    data: { usuarioId: usuario.id, casaId: casa.id, papel: "DONO" },
  });
  const sessionToken = randomUUID();
  await prisma.session.create({
    data: {
      sessionToken,
      userId: usuario.id,
      expires: new Date(Date.now() + 86_400_000),
    },
  });
  return { sessionToken, usuarioId: usuario.id, casaId: casa.id };
}

/**
 * Remove a Casa descartável e o usuário. Compras saem primeiro: o cascade da
 * Casa apagaria Item antes de CompraItem (que restringe), quebrando a ordem.
 */
export async function limparSessaoDeTeste({ usuarioId, casaId }: SessaoDeTeste) {
  await prisma.compra.deleteMany({ where: { casaId } });
  await prisma.casa.delete({ where: { id: casaId } });
  await prisma.user.delete({ where: { id: usuarioId } });
  await prisma.$disconnect();
}
