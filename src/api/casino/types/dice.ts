// Definiowanie typów dla zakładów w grze w kości
export type SumValueBet = {
    type: "sumValue";
    value: number; // Wartość od 2 do 12
  };
  
  export type ParityBet = {
    type: "parity";
    value: "even" | "odd"; // Parzyste lub nieparzyste
  };
  
  export type RangeBet = {
    type: "range";
    value: "high" | "low"; // Wysoka (8-12) lub niska (2-7)
  };
  
  export type PassLineBet = {
    type: "passLine";
    value: "pass" | "dontPass"; // Pass Line lub Don't Pass
  };
  
  export type SpecificDoubleBet = {
    type: "specificDouble";
    value: 1 | 2 | 3 | 4 | 5 | 6; // Konkretna wartość dubletu
  };
  
  export type SingleDieValueBet = {
    type: "singleDieValue";
    value: 1 | 2 | 3 | 4 | 5 | 6; // Wartość, która ma pojawić się na co najmniej jednej kości
  };
  
  // Typ łączący wszystkie możliwe zakłady
  export type DiceBetChoice = 
    | SumValueBet
    | ParityBet
    | RangeBet
    | PassLineBet
    | SpecificDoubleBet
    | SingleDieValueBet;
  
  // Interfejs dla requestu do gry w kości
  export interface DiceGameRequest {
    betChoice: DiceBetChoice;
  }
  
  // Przykładowy interfejs dla przechowywania stanu gry w Redis
  export interface DiceGameState {
    status: "new" | "in-game" | "point-established" | "completed";
    bet: number;
    cryptoId: string;
    gameDetails: DiceBetChoice;
    diceRolls: string; // JSON string zawierający historię rzutów
    point?: number; // Dla zakładów Pass Line - ustalony punkt
  }