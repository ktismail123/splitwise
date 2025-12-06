// ============================================
// models/settlement.model.ts
// ============================================
export interface Person {
  id: number;
  name: string;
}

export interface Payment {
  id: number;
  name: string;
  amount: number;
  paidBy: number;
  splitType: 'equal' | 'custom';
  splitAmong: { [personId: number]: number };
}

export interface EventData {
  eventName: string;
  currency: string;
  people: Person[];
  payments: Payment[];
  currentStep: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}