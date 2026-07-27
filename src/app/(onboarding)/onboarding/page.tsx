import { redirect } from "next/navigation";
import { getSessao } from "@/shared/auth/sessao";
import OnboardingCliente from "./OnboardingCliente";

// Server Component fino: lê o nome já conhecido da sessão (o Google traz do
// perfil OAuth; o login por email vem sem nome) e entrega ao cliente para
// pré-preencher o campo do passo 2.
export default async function OnboardingPage() {
  const sessao = await getSessao();
  if (!sessao?.usuarioId) redirect("/login");
  // Quem já tem Casa não passa de novo pelo onboarding: evita criar uma
  // segunda Casa órfã (a sessão sempre resolve a primeira, por criadoEm).
  if (sessao.casaId) redirect("/lista");

  return <OnboardingCliente nomeInicial={sessao.user?.name ?? ""} />;
}
