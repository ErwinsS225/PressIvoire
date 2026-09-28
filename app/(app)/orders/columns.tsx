"use client"

import { Badge } from "@/components/ui/badge"
import { type OrderWithClient, statusMapping } from "@/lib/constants"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const columns: ColumnDef<OrderWithClient>[] = [
    {
        accessorKey: "order_number",
        header: "Commande",
    },
    {
        accessorKey: "client.full_name",
        header: "Client",
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            const statusInfo = statusMapping[status]

            if (!statusInfo) {
                return <Badge variant="outline">Inconnu</Badge>
            }

            return (
                <Badge variant={statusInfo.variant as any} className="capitalize">
                    {statusInfo.label}
                </Badge>
            )
        },
    },
    {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("total"))
            return <div className="font-medium">{formatCurrency(amount)}</div>
        },
    },
    {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => {
            return formatDateTime(row.getValue("created_at"))
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const order = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(order.id)}
                        >
                            Copier l&apos;ID de la commande
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                        <DropdownMenuItem>Modifier le statut</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]