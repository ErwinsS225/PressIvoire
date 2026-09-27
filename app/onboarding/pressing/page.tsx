import { redirect } from "next/navigation";
import { getContext } from "@/lib/supabase/queries";

/**
 * Point d'entree de l'onboarding : `/onboarding/pressing` mene directement a
 * l'etape 1. Le layout voisin gere deja les autres cas (client, pressing deja
 * cree, pas de session).
 */
export default async function OnboardingIndexPage() {
  const { pressing, userId } = await getContext();

  if (!userId) redirect("/login");
  if (pressing) redirect("/dashboard");

  redirect("/onboarding/pressing/step-1");
}
