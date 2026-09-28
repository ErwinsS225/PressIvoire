/**
 * Fond animé du tableau de bord.
 *
 * Trois taches de couleur dérivent lentement derrière les cartes en verre.
 * Sans elles, `backdrop-filter` n'a rien à dégrader : le flou porte sur un
 * aplat uniforme et l'effet de verre est invisible.
 *
 * Monté une seule fois, dans le layout authentifié — pas dans chaque page.
 *
 * `aria-hidden` : c'est de la décoration. Un lecteur d'écran doit annoncer
 * « Tableau de bord » puis les chiffres, pas trois descripteurs de formes.
 */
export function AuroraBackground() {
    return (
        <div className="aurora-bg" aria-hidden>
            <div className="aurora-bg__blob aurora-bg__blob--1" />
            <div className="aurora-bg__blob aurora-bg__blob--2" />
            <div className="aurora-bg__blob aurora-bg__blob--3" />
            <div className="aurora-bg__grain" />
        </div>
    );
}
