interface SlotResult {
  drawnSymbols: string[];
  winAmount: number;
  totalBet: number;
  netProfit: number;
}

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