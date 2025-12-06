import { Injectable } from '@angular/core';
import { Payment, Person, Settlement } from '../models/settlement.model';

@Injectable({
  providedIn: 'root'
})
export class CalculationService {
  calculateSettlements(people: Person[], payments: Payment[]): Settlement[] {
    const balances: { [id: number]: number } = {};
    
    people.forEach(person => {
      balances[person.id] = 0;
    });

    payments.forEach(payment => {
      balances[payment.paidBy] += payment.amount;
      
      if (payment.splitType === 'equal') {
        const participantIds = Object.keys(payment.splitAmong)
          .map(id => parseInt(id))
          .filter(id => payment.splitAmong[id] > 0);
        const perPerson = payment.amount / participantIds.length;
        
        participantIds.forEach(personId => {
          balances[personId] -= perPerson;
        });
      } else {
        Object.keys(payment.splitAmong).forEach(personIdStr => {
          const personId = parseInt(personIdStr);
          balances[personId] -= payment.splitAmong[personId];
        });
      }
    });

    const creditors: Array<{ id: number; name: string; amount: number }> = [];
    const debtors: Array<{ id: number; name: string; amount: number }> = [];

    people.forEach(person => {
      if (balances[person.id] > 0.01) {
        creditors.push({ id: person.id, name: person.name, amount: balances[person.id] });
      } else if (balances[person.id] < -0.01) {
        debtors.push({ id: person.id, name: person.name, amount: -balances[person.id] });
      }
    });

    const settlements: Settlement[] = [];
    let i = 0, j = 0;

    while (i < creditors.length && j < debtors.length) {
      const amount = Math.min(creditors[i].amount, debtors[j].amount);
      
      settlements.push({
        from: debtors[j].name,
        to: creditors[i].name,
        amount: Math.round(amount * 100) / 100
      });

      creditors[i].amount -= amount;
      debtors[j].amount -= amount;

      if (creditors[i].amount < 0.01) i++;
      if (debtors[j].amount < 0.01) j++;
    }

    return settlements;
  }

  getTotalAmount(payments: Payment[]): number {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }

  getPersonTotal(personId: number, payments: Payment[]): number {
    return payments
      .filter(p => p.paidBy === personId)
      .reduce((sum, p) => sum + p.amount, 0);
  }
}