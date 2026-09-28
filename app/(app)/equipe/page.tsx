import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
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
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getContext } from "@/lib/supabase/queries";
import { getEffectivePlan } from "@/lib/subscriptions";
import { countHiredStaff, getTeam } from "@/lib/team";
import { roleLabel } from "@/lib/constants";
import { AddMemberForm } from "./add-member-form";

export const metadata = { title: "Équipe" };

/** Badges par rôle : le propriétaire se distingue des employés. */
const ROLE_VARIANT: Record<
    string,
    "default" | "success" | "info" | "muted" | "destructive"
> = {
    owner: "default",
    manager: "info",
    cashier: "success",
    driver: "muted",
    client: "muted",
};

/**
 * Équipe du pressing.
 *
 * Seuls un gérant ou un responsable y accèdent : un caissier n'a aucune
 * raison de voir les comptes du pressing, et encore moins de les modifier.
 * Le contrôle est aussi posé dans les fonctions SQL de la migration 006 —
 * celui-ci n'est que la partie lisible de la décision.
 */
export default async function TeamPage() {
    const { pressing, profile } = await getContext();

    if (!pressing) {
        redirect("/onboarding/pressing");
    }

    const canManage = profile?.role === "owner" || profile?.role === "manager";

    if (!canManage) {
        return (
            <div className="flex flex-col gap-8">
                <Header title="Équipe" />
                <Card className="max-w-2xl">
                    <CardContent className="pt-6 text-sm text-muted-foreground">
                        La gestion de l&apos;équipe est réservée au gérant et au
                        responsable du pressing.
                    </CardContent>
                </Card>
            </div>
        );
    }

    const [team, plan] = await Promise.all([getTeam(), getEffectivePlan()]);
    const hired = await countHiredStaff(pressing.id);
    const quota = plan?.limits.staffMembers ?? null;
    const atQuota = quota !== null && hired >= quota;

    return (
        <div className="flex flex-col gap-8">
            <Header
                title="Équipe"
                subtitle={`${team.length} compte${team.length > 1 ? "s" : ""} rattaché${team.length > 1 ? "s" : ""} à ce pressing`}
            />

            <Card className={atQuota ? "border-orange-200" : undefined}>
                <CardContent className="flex items-center justify-between gap-4 pt-6">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Effectif embauché
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">
                            {hired}
                            {quota !== null ? ` / ${quota}` : ""}
                        </p>
                    </div>
                    <p className="max-w-sm text-right text-sm text-muted-foreground">
                        {quota === null
                            ? `Plan ${plan?.plan.name} : pas de limite d'effectif.`
                            : atQuota
                              ? "Quota atteint. Le plan Pro autorise 5 employés."
                              : `Plan ${plan?.plan.name} : ${quota} employé${quota > 1 ? "s" : ""} au maximum, propriétaire exclu.`}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Membres</CardTitle>
                    <CardDescription>
                        Comptes rattachés à ce pressing, y compris les comptes
                        désactivés — un gérant doit pouvoir les voir pour les
                        réactiver.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Membre</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Téléphone</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Rattaché le</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {team.length === 0 ? (
                                <TableEmpty colSpan={5}>
                                    Aucun membre pour l&apos;instant.
                                </TableEmpty>
                            ) : (
                                team.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <p className="font-medium">
                                                {member.full_name || "Sans nom"}
                                            </p>
                                            {member.email ? (
                                                <p className="text-xs text-muted-foreground">
                                                    {member.email}
                                                </p>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={ROLE_VARIANT[member.role] ?? "muted"}
                                            >
                                                {roleLabel(member.role)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {member.phone ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {member.is_active ? (
                                                <Badge variant="success">Actif</Badge>
                                            ) : (
                                                <Badge variant="danger">Désactivé</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {new Date(
                                                member.created_at,
                                            ).toLocaleDateString("fr-FR")}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle>Ajouter un employé</CardTitle>
                    <CardDescription>
                        La personne doit d&apos;avoir créé un compte depuis
                        l&apos;écran d&apos;inscription — en choisissant « Je suis
                        client ». Le compte existe alors sans pressing, et attend
                        d&apos;être rattaché.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {atQuota ? (
                        <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
                            Quota d&apos;effectif atteint pour le plan{" "}
                            {plan?.plan.name}. Passez au plan Pro pour recruter
                            davantage.
                        </p>
                    ) : (
                        <AddMemberForm pressingId={pressing.id} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

