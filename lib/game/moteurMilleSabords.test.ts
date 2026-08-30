import { calculateScore, magicPirate, deathIslandFirstRoll } from "./moteurMilleSabords";

const base = ["coin","coin","coin","sabre","sabre","sabre","diamond","skull"] as const;

console.assert(calculateScore([...base], {type:"pirate"}).total === 800,
  "Le calcul de base avec Pirate doit être cohérent.");

console.assert(magicPirate(
  ["coin","coin","coin","coin","coin","coin","coin","coin"],
  {type:"coin"}
), "Magie Pirate Pièce doit être détectée.");

console.assert(deathIslandFirstRoll(
  ["skull","skull","skull","skull","coin","diamond","sabre","monkey"],
  {type:"pirate"}
), "4 têtes de mort au premier lancer doivent envoyer sur l'île.");
