import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { type OrderStatus, ORDER_STATUS_LABELS } from "@/lib/constants";

interface RecentOrder {
    id: string;
    total: number;
    status: OrderStatus;
    customer: {
        name: string | null;
        avatarUrl: string | null;
    };
    createdAt: Date;
}

interface RecentOrdersProps {
    orders: RecentOrder[];
}

const statusMapping: Record<
    OrderStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
    pending: { label: "Reçue", variant: "secondary" },
    pickup_scheduled: { label: "Collecte planifiée", variant: "outline" },
    picked_up: { label: "Collectée", variant: "outline" },
    in_processing: { label: "En traitement", variant: "outline" },
    ready: { label: "Prête", variant: "default" },
    out_for_delivery: { label: "En livraison", variant: "default" },
    delivered: { label: "Livrée", variant: "default" },
    cancelled: { label: "Annulée", variant: "destructive" },
    disputed: { label: "Litige", variant: "destructive" },
};

export function RecentOrders({ orders }: RecentOrdersProps) {
    return (
        <Card
            className="elev-1 stagger-item border-0"
            style={{ "--stagger-index": 5 } as React.CSSProperties}
        >
            <CardHeader>
                <CardTitle>Commandes Récentes</CardTitle>
                <CardDescription>
                    Les 5 dernières commandes enregistrées.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage
                                                src={order.customer.avatarUrl ?? undefined}
                                                alt="Avatar"
                                            />
                                            <AvatarFallback>
                                                {getInitials(order.customer.name ?? "??")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-1">
                                            <p className="text-sm font-medium leading-none">
                                                {order.customer.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={statusMapping[order.status].variant}
                                        className="capitalize"
                                    >
                                        {statusMapping[order.status].label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {new Intl.NumberFormat("fr-FR", {
                                        style: "currency",
                                        currency: "XOF",
                                    }).format(order.total)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}