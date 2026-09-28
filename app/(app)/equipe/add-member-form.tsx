"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { inviteMemberAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Formulaire d'ajout d'un employé.
 *
 * L'identifiant transmis est l'UUID du compte `auth.users`, pas l'email :
 * la fonction SQL `add_team_member` travaille sur des UUID. L'email sert
 * uniquement à l'affichage — le compte doit déjà exister, ce que la fonction
 * vérifie côté base.
 */
export function AddMemberForm({
    pressingId,
    disabled,
}: {
    pressingId: string;
    /** Quota atteint : le formulaire est affiché mais inactif. */
    disabled?: boolean;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [userId, setUserId] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState("cashier");

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        // Un UUID fait 36 caractères (32 hexa + 4 tirets). On le verifie ici
        // pour rendre une erreur lisible, la base refusant de toute facon.
        const uuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                userId.trim(),
            );
        if (!uuid) {
            toast.error("Identifiant de compte invalide (UUID attendu).");
            return;
        }

        startTransition(async () => {
            // Passe par la Server Action : `addTeamMember` vit dans un module
            // serveur et ne peut pas etre importe dans un composant client.
            const result = await inviteMemberAction(
                pressingId,
                userId.trim(),
                role,
                fullName.trim(),
                phone.trim() || null,
            );

            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Employé rattaché au pressing.");
            setUserId("");
            setFullName("");
            setPhone("");
            router.refresh();
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid max-w-2xl gap-4">
            <div className="grid gap-2">
                <Label htmlFor="team-user-id">
                    Identifiant du compte (UUID)
                </Label>
                <Input
                    id="team-user-id"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                    disabled={disabled || isPending}
                    required
                />
                <p className="text-xs text-muted-foreground">
                    Se trouve dans l&apos;URL de confirmation d&apos;inscription
                    du nouvel employé.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="team-name">Nom complet</Label>
                    <Input
                        id="team-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Aya Koné"
                        disabled={disabled || isPending}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="team-phone">Téléphone</Label>
                    <Input
                        id="team-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+225 07 08 09 10 11"
                        disabled={disabled || isPending}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="team-role">Rôle</Label>
                    <select
                        id="team-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={disabled || isPending}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="cashier">Caissier</option>
                        <option value="driver">Livreur</option>
                        <option value="manager">Responsable</option>
                    </select>
                </div>
            </div>

            <div>
                <Button type="submit" disabled={disabled || isPending}>
                    <UserPlus className="h-4 w-4" />
                    {isPending ? "Rattachement…" : "Rattacher au pressing"}
                </Button>
            </div>
        </form>
    );
}
