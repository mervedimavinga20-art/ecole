// Configuration de la base de données en ligne (Supabase).
// La clé "publishable" est faite pour être dans l'application : la sécurité vient des règles de la base.
// Ne mets JAMAIS ici la clé "secret" ou "service_role".
// Pour travailler sans base (données seulement sur ce téléphone), supprime ce fichier ou mets url à "".
window.SB_CONFIG = {
  url: "https://nktzjqolryykurawlvhp.supabase.co",
  key: "sb_publishable_tfSn74Z_xOeOW7gdz8WJWA_27jrRo2m",
  // Adresse de l'espace parents, ajoutée aux messages d'accès envoyés aux familles (calculée toute seule une fois en ligne).
  espaceUrl: location.protocol === "https:" ? location.origin + location.pathname.replace(/[^\/]*$/, "") + "espace.html" : ""
};
