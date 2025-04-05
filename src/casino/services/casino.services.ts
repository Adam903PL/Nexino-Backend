import { prisma } from "../../prisma";
import random from "random"
import { RouletteDTO } from "../dto/Roulette.dto";
import { diceResult, RouletteResult } from "../types";
import { DiceGameState } from "../types/dice";
import { redis } from "../../config/redis";

export const SlotMachine = (betAmount: number) => {

  const SYMBOLS = [
    { symbol: "🍇", weight: 0.40, value: 1.5 }, 
    { symbol: "🍊", weight: 0.30, value: 2 },  
    { symbol: "🍋", weight: 0.15, value: 3 },
    { symbol: "🍉", weight: 0.10, value: 3.5 }, 
    { symbol: "🎰", weight: 0.03, value: 4 },  
    { symbol: "🍒", weight: 0.015, value: 10 },
    { symbol: "💎", weight: 0.005, value: 15 }, 
  ];

  function weightedRandom(symbols: typeof SYMBOLS) {
    const totalWeight = symbols.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of symbols) {
      if (random < item.weight) {
        return item;
      }
      random -= item.weight;
    }
    return symbols[0];
  }

  const numberOfSpin = 3;
  const drawnSymbols: string[] = [];
  const drawnSymbolDetails: (typeof SYMBOLS)[0][] = [];

  for (let i = 0; i < numberOfSpin; i++) {
    const drawnSymbol = weightedRandom(SYMBOLS);
    drawnSymbols.push(drawnSymbol.symbol);
    drawnSymbolDetails.push(drawnSymbol);
  }


  const allSymbolsSame = drawnSymbols.every(s => s === drawnSymbols[0]);
  const twoSame = drawnSymbols.filter(s => s === drawnSymbols[0]).length >= 2;

  let winAmount = 0;
  
  if (allSymbolsSame) {
    winAmount = betAmount * drawnSymbolDetails[0].value * 2;
  } else if (twoSame) {
    winAmount = betAmount * drawnSymbolDetails[0].value;
  }

  const netProfit = winAmount - betAmount;

  return {
    drawnSymbols,
    winAmount: Math.round(winAmount),
    totalBet: betAmount,
    netProfit: Math.round(netProfit),
  };
};




export const RouletteMachine = ():RouletteResult | null => {
  const randomNumber = random.int(0, 36); 
  if(randomNumber === 0 ){
    return({color:"Green",number:randomNumber})
  }
  const randomColor = random.choice(["Black","Red"])
  if(!randomColor){
    return null
  }

  return {color:randomColor,number:randomNumber}

}


export function calculateRoulettePayout(betChoice: RouletteDTO, amount:number,result:RouletteResult) {
  const { type, numbers } = betChoice.betChoice;


  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];


  switch (type) {
    case "Red":
      if (type === result.color) {
        return amount*0.5; 
      }
      break;

    case "Black":
      if (type === result.color) {
        return amount*0.5;
      }
      break;

    case "Green":
      if (result.number === 0) {
        return amount * 35; 
      }
      break;

    case "Straight":
      if (numbers && numbers[0] === result.number) {
        return amount * 35; 
      }
      break;

    case "Split":
      if (numbers && numbers.includes(result.number)) {
        return amount * 17; 
      }
      break;

    case "Street":
      if (numbers && numbers.includes(result.number)) {
        return amount * 11; 
      }
      break;

    case "Corner":
      if (numbers && numbers.includes(result.number)) {
        return amount * 8; 
      }
      break;

    case "Line":
      if (numbers && numbers.includes(result.number)) {
        return amount * 5; 
      }
      break;

    default:
      return null
  }

  
  return -amount;
}

























async function main() {

}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());