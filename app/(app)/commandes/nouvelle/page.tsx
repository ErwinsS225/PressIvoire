import { Screen, ScreenHeader } from "@/components/mobile/screen";
import { NewOrderFlow } from "@/components/mobile/new-order-flow";
import { getArticles, getClients, getContext } from "@/lib/supabase/queries";

export const metadata = { title: "Nouvelle commande" };

/**
 * Les clients et le catalogue sont charges cote serveur puis envoyes au
 * composant interactif : le navigateur n'a rien a re-querir pour afficher
 * le parcours.
 */
export default async function NewOrderPage() {
  const { pressing } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Nouvelle commande" backHref="/dashboard" />
      </Screen>
    );
  }

  const [clients, articles] = await Promise.all([
    getClients(pressing.id),
    getArticles(pressing.id),
  ]);

  return (
    <Screen>
      <ScreenHeader
        title="Nouvelle commande"
        subtitle={`Étape ${1} sur 3`}
        backHref="/dashboard"
      />

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
    </Screen>
  );
}
