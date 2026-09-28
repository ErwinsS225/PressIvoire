import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { NewOrderFlow } from "@/components/orders/new-order-flow";
import { getArticles, getClients, getContext } from "@/lib/supabase/queries";

export const metadata = { title: "Nouvelle commande" };

/**
 * Les clients et le catalogue sont charges cote serveur puis envoyes au
 * composant interactif : le navigateur n'a rien a re-querir pour afficher
 * le parcours.
 *
 * Le composant `NewOrderFlow` est conserve tel quel : ses etapes (choix du
 * client, des articles, du mode de remise) sont un formulaire, pas une mise
 * en page — il s'adapte au desktop via les prefixes `md:` sans duplication.
 */
export default async function NewOrderPage() {
  const { pressing } = await getContext();

  if (!pressing) {
    redirect("/onboarding/pressing");
  }

  const [clients, articles] = await Promise.all([
    getClients(pressing.id),
    getArticles(pressing.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <Header
        title="Nouvelle commande"
        subtitle="Enregistrer une commande pour un client du pressing."
      >
        <Button asChild variant="outline">
          <Link href="/orders">Annuler</Link>
        </Button>
      </Header>

      <div className="mx-auto w-full max-w-3xl">
        <NewOrderFlow
          clients={clients.map((client) => ({
            id: client.id,
            full_name: client.full_name,
            phone: client.phone,
          }))}
          articles={articles.map((article) => ({
            id: article.id,
            name: article.name,
            category: article.category,
            wash_type: article.wash_type,
            price: article.price,
          }))}
          deliveryFee={pressing.delivery_fee ?? 0}
        />
      </div>
    </div>
  );
}
