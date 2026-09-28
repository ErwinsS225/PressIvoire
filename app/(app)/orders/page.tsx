import { Header } from "@/components/layout/header";
import { getContext, getOrdersForPressing } from "@/lib/supabase/queries";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default async function OrdersPage() {
    const { pressing } = await getContext();

    if (!pressing) {
        return (
            <div className="flex h-full items-center justify-center">
                <p>Aucun pressing trouvé. Veuillez compléter l&apos;onboarding.</p>
            </div>
        );
    }

    const orders = await getOrdersForPressing(pressing.id);

    return (
        <div>
            <Header
                title="Commandes"
                subtitle="Gérez et suivez toutes les commandes de votre pressing."
            >
                {/* Le bouton pour créer une commande sera ajouté ici */}
            </Header>
            <div className="p-6">
                <DataTable columns={columns} data={orders} />
            </div>
        </div>
    );
}