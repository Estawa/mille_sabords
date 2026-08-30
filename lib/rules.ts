// ⚠️ Fichier obsolète depuis l’introduction de lib/engine.ts (moteur consolidé unique). Conservé pour référence historique, non importé par l’interface.

export type DieSymbol = 'diamond'|'coin'|'monkey'|'parrot'|'sabre'|'skull';
export const SYMBOLS: Record<DieSymbol,string> = {diamond:'💎',coin:'🪙',monkey:'🐒',parrot:'🦜',sabre:'⚔️',skull:'💀'};
export const COMBO_POINTS: Record<number,number> = {3:100,4:200,5:500,6:1000,7:2000,8:4000};
export type CardType='pirate'|'treasureIsland'|'skull1'|'skull2'|'guardian'|'gold'|'diamond'|'animals'|'ship';
export type PirateCard={type:CardType; label:string; icon:string; skulls?:number; sabresRequired?:number; successBonus?:number; failurePenalty?:number};

// The 8 card families documented by the published rules. Exact physical-card
// quantities and the ship card's printed values should be taken from the user's
// edition before declaring the deck a certified 35-card reproduction.
export const CARD_LIBRARY: PirateCard[] = [
 {type:'pirate',label:'Pirate',icon:'🏴‍☠️'},
 {type:'treasureIsland',label:'Île au Trésor',icon:'🏝️'},
 {type:'skull1',label:'Tête de Mort ×1',icon:'💀',skulls:1},
 {type:'skull2',label:'Tête de Mort ×2',icon:'💀',skulls:2},
 {type:'guardian',label:'Gardienne',icon:'👩'},
 {type:'gold',label:"Pièce d'or",icon:'🪙'},
 {type:'diamond',label:'Diamant',icon:'💎'},
 {type:'animals',label:'Animaux',icon:'🐒🦜'},
 {type:'ship',label:'Bateau Pirate',icon:'🚢'},
];

export function rollDie():DieSymbol {
 const a:DieSymbol[]=['diamond','coin','monkey','parrot','sabre','skull'];
 return a[Math.floor(Math.random()*a.length)];
}
export function roll(n:number):DieSymbol[]{return Array.from({length:n},rollDie)};

export type ScoreDetail={label:string;points:number};
export function scoreDice(dice:DieSymbol[], animals=false):{points:number;details:ScoreDetail[];usedAll:boolean} {
 const details:ScoreDetail[]=[];
 const counts:Record<string,number>={};
 dice.forEach(d=>{const key=animals&&(d==='monkey'||d==='parrot')?'animals':d;counts[key]=(counts[key]||0)+1});
 let points=0;
 for(const [key,count] of Object.entries(counts)){
   if(key==='skull') continue;
   if(count>=3){const p=COMBO_POINTS[Math.min(count,8)]||0; points+=p; details.push({label:`Combinaison ${count} × ${key}`,points:p});}
   if(key==='coin'||key==='diamond'){points+=count*100;details.push({label:`${count} ${key==='coin'?'pièce(s) d’or':'diamant(s)'}`,points:count*100});}
 }
 const usedAll=dice.length===8 && dice.length>0;
 if(usedAll){points+=500;details.push({label:'Coffre au trésor plein',points:500});}
 return {points,details,usedAll};
}

export function explainScore(dice:DieSymbol[], card:PirateCard):{points:number;details:ScoreDetail[];bust:boolean;isIsland:boolean} {
 const extra:DieSymbol[] = card.type==='gold'?['coin']:card.type==='diamond'?['diamond']:[];
 const all=[...dice,...extra];
 const skulls=all.filter(x=>x==='skull').length;
 if(card.type==='ship' && dice.filter(x=>x==='skull').length>=4) return {points:0,details:[{label:'Bateau Pirate : 4 têtes de mort au premier lancer',points:0}],bust:true,isIsland:false};
 if(skulls>=3) return {points:0,details:[{label:'3 têtes de mort : tour perdu',points:0}],bust:true,isIsland:false};
 const base=scoreDice(all.filter(x=>x!=='skull'),card.type==='animals');
 let points=base.points;
 const details=[...base.details];
 if(card.type==='pirate'){const bonus=base.points;points+=bonus;details.push({label:'Carte Pirate : doublement',points:bonus});}
 if(card.type==='ship'){
   // The printed sabre target/bonus/penalty varies by physical card.
   // Those values are represented on PirateCard and must be populated from the edition.
   const sabres=dice.filter(x=>x==='sabre').length;
   if(card.sabresRequired!==undefined){
     if(sabres>=card.sabresRequired){points+=(card.successBonus||0);if(card.successBonus)details.push({label:`Bateau Pirate : bonus (${card.sabresRequired} sabres requis)`,points:card.successBonus});}
     else {points=0;details.push({label:`Bateau Pirate : objectif de ${card.sabresRequired} sabres non atteint`,points:0});}
   }
 }
 return {points,details,bust:false,isIsland:false};
}
