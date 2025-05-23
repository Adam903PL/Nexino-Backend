export interface SymbolArr {
  symbol: string;
  weight: number;
  // multiplier:number
}

export interface CryptoWallet {
  id: string;
  userId: string;
  cryptoId: string;
  quantity: number;
  updatedAT: Date;
}

interface UserIdentification {
  userId: string;
}

interface SlotMachineBetRequest {
  bet: string;
  cryptoId: string;
}


export interface RouletteResult {
  color:string,
  number:number
}

export interface diceResult {
  firstDice:number,
  secondDice:number
}



export interface CrapsGame {
  status: 'in-game' | 'not-in-game' | 'completed';
}




