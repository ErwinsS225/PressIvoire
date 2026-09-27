import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Créer un compte" };

/**
 * Page d'inscription — coquille serveur, formulaire client.
 *
 * La separation n'est pas cosmetique : le selecteur de role passe une
 * fonction a `AuthForm` (pour relier les cartes au react-hook-form), et une
 * fonction ne peut pas traverser la frontiere RSC. Le formulaire doit donc
 * etre cote client, tout en gardant `metadata` — interdit dans un Client
 * Component — cote serveur.
 */
export default function RegisterPage() {
  return <RegisterForm />;
}
