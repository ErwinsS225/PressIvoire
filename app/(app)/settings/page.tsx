import { Header } from "@/components/layout/header";

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-8">
            <Header>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
                    <p className="text-muted-foreground">
                        Gérez les paramètres de votre compte et de votre pressing.
                    </p>
                </div>
            </Header>
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
                <div className="flex flex-col items-center gap-1 text-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                        Page en construction
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Cette section sera bientôt disponible.
                    </p>
                </div>
            </div>
        </div>
    );
}