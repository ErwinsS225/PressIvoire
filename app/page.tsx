import { redirect } from "next/navigation";

/**
 * Racine de l'application.
 *
 * L'accueil public vit désormais sur le site de marketing (landing
 * Vercel), qui explique le produit et collecte les demandes. Cette page
 * n'est donc plus qu'un aiguillage : elle renvoie vers l'inscription.
 *
 * Un visiteur déjà connecté est renvoyé vers son tableau de bord par le
 * middleware (`GUEST_ONLY_PATHS` contient `/register`, cf. middleware.ts) :
 * un seul point de redirection suffit donc, sans tester la session ici.
 */
export default function Home() {
  redirect("/register");
}
