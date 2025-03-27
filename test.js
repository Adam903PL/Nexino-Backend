
function weightedRandom(symbols) {
  const totalWeight = symbols.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of symbols) {
      if (random < item.weight) {
          return item.symbol;
      }
      random -= item.weight;
  }
  
  // Fallback return (should never happen)
  return symbols[0].symbol;
}

function SlotMachine(betAmount ){
  const SYMBOLS= [
      { symbol: "🍇", weight: 0.25, payout: 2 },
      { symbol: "🍊", weight: 0.2, payout: 3 },
      { symbol: "🍋", weight: 0.15, payout: 4 },
      { symbol: "🍉", weight: 0.12, payout: 5 },
      { symbol: "🎰", weight: 0.08, payout: 10 },
      { symbol: "🍒", weight: 0.05, payout: 15 },
      { symbol: "💎", weight: 0.05, payout: 20 }
  ];

  const numberOfSpin = 3;
  const drawnSymbols= [];

  // Draw symbols
  for (let i = 0; i < numberOfSpin; i++) {
      drawnSymbols.push(weightedRandom(SYMBOLS));
  }

  // Calculate winnings
  let winnings = 0;
  const isAllSame = drawnSymbols.every(symbol => symbol === drawnSymbols[0]);

  if (isAllSame) {
      // Find the payout multiplier for the winning symbol
      const winningSymbol = SYMBOLS.find(s => s.symbol === drawnSymbols[0]);
      if (winningSymbol) {
          winnings = betAmount * winningSymbol.payout;
      }
  }

  return {
      symbols: drawnSymbols,
      winnings: winnings,
      totalBet: betAmount
  };
}

// Example usage
function playSlotMachine(betAmount) {
  const result = SlotMachine(betAmount);
  console.log('Drawn Symbols:', result.symbols);
  console.log('Bet Amount:', result.totalBet);
  console.log('Winnings:', result.winnings);
  console.log('Net Result:', result.winnings - result.totalBet);
}

// Play with a 10 unit bet
playSlotMachine(10);