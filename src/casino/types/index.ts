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
