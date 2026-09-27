import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Mot de passe oublié" };

/**
 * Page mot de passe oublie — coquille serveur, formulaire client.
 *
 * La séparation reprend celle de `/register` : l'écran d'avertissement et le
 * renvoi exigent un état local, donc le composant est client. `metadata` reste
 * ici, seul endroit où Next.js l'autorise.
 */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}