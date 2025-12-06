import { Component } from '@angular/core';
import { Payment, Person } from '../../models/settlement.model';
import { StorageService } from '../../services/storage.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface CustomSplitItem {
  description: string;
  amount: number;
}

// Extended Payment interface to include custom split details
interface PaymentWithDetails extends Payment {
  customSplitDetails?: { [personId: number]: CustomSplitItem[] };
}

@Component({
  selector: 'app-add-payments',
  imports: [FormsModule, CommonModule],
  templateUrl: './add-payments.html',
  styleUrl: './add-payments.scss'
})
export class AddPayments {
  people: Person[] = [];
  payments: PaymentWithDetails[] = [];
  currency = 'USD';
  editingPayment: PaymentWithDetails | null = null;

  paymentForm = {
    name: '',
    amount: 0,
    paidBy: 0,
    splitType: 'equal' as 'equal' | 'custom',
    splitAmong: {} as { [key: number]: number }
  };

  // Store multiple items per person for custom split
  customSplitItems: { [personId: number]: CustomSplitItem[] } = {};

  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  ngOnInit() {
    const data = this.storage.loadData();
    this.people = data.people;
    this.payments = data.payments;
    this.currency = data.currency;
    this.initializeSplitAmong();
  }

  initializeSplitAmong() {
    this.people.forEach(person => {
      this.paymentForm.splitAmong[person.id] = this.paymentForm.splitType === 'equal' ? 1 : 0;
      
      if (!this.customSplitItems[person.id]) {
        this.customSplitItems[person.id] = [];
      }
    });
  }

  onSplitTypeChange() {
    this.initializeSplitAmong();
    
    if (this.paymentForm.splitType === 'equal') {
      this.people.forEach(person => {
        this.customSplitItems[person.id] = [];
      });
    }
  }

  toggleEqualSplit(personId: number) {
    this.paymentForm.splitAmong[personId] = this.paymentForm.splitAmong[personId] === 1 ? 0 : 1;
  }

  // ========== CUSTOM SPLIT ITEMS METHODS ==========

  addCustomSplitItem(personId: number) {
    if (!this.customSplitItems[personId]) {
      this.customSplitItems[personId] = [];
    }
    this.customSplitItems[personId].push({
      description: '',
      amount: 0
    });
  }

  removeCustomSplitItem(personId: number, index: number) {
    this.customSplitItems[personId].splice(index, 1);
    this.updateCustomSplitTotal();
  }

  getCustomSplitItems(personId: number): CustomSplitItem[] {
    return this.customSplitItems[personId] || [];
  }

  getPersonCustomTotal(personId: number): number {
    const items = this.customSplitItems[personId] || [];
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  updateCustomSplitTotal() {
    this.people.forEach(person => {
      this.paymentForm.splitAmong[person.id] = this.getPersonCustomTotal(person.id);
    });
  }

  // ========== EXISTING METHODS ==========

  getCustomSplitTotal(): number {
    return Object.values(this.paymentForm.splitAmong).reduce((sum, val) => sum + (val || 0), 0);
  }

  isCustomSplitValid(): boolean {
    if (this.paymentForm.splitType === 'custom') {
      const total = this.getCustomSplitTotal();
      return Math.abs(total - this.paymentForm.amount) < 0.01;
    }
    return true;
  }

  isPaymentValid(): boolean {
    if (!this.paymentForm.name.trim() || this.paymentForm.amount <= 0 || this.paymentForm.paidBy === 0) {
      return false;
    }

    if (this.paymentForm.splitType === 'equal') {
      return Object.values(this.paymentForm.splitAmong).some(v => v === 1);
    } else {
      return this.isCustomSplitValid();
    }
  }

  savePayment() {
    if (this.isPaymentValid()) {
      const payment: PaymentWithDetails = {
        id: this.editingPayment?.id || Date.now(),
        name: this.paymentForm.name,
        amount: this.paymentForm.amount,
        paidBy: this.paymentForm.paidBy,
        splitType: this.paymentForm.splitType,
        splitAmong: { ...this.paymentForm.splitAmong }
      };

      // Save custom split details if it's a custom split
      if (this.paymentForm.splitType === 'custom') {
        payment.customSplitDetails = {};
        this.people.forEach(person => {
          const items = this.customSplitItems[person.id] || [];
          if (items.length > 0) {
            payment.customSplitDetails![person.id] = items.map(item => ({
              description: item.description,
              amount: item.amount
            }));
          }
        });
      }

      if (this.editingPayment) {
        this.payments = this.payments.map(p => p.id === payment.id ? payment : p);
      } else {
        this.payments.push(payment);
      }

      this.storage.updateEventData({ payments: this.payments });
      this.resetForm();
    }
  }

  editPayment(payment: PaymentWithDetails) {
    this.editingPayment = payment;
    this.paymentForm = {
      name: payment.name,
      amount: payment.amount,
      paidBy: payment.paidBy,
      splitType: payment.splitType,
      splitAmong: { ...payment.splitAmong }
    };

    // Load custom split details if available
    if (payment.splitType === 'custom' && payment.customSplitDetails) {
      this.people.forEach(person => {
        const items = payment.customSplitDetails![person.id] || [];
        this.customSplitItems[person.id] = items.map(item => ({
          description: item.description,
          amount: item.amount
        }));
      });
    } else if (payment.splitType === 'custom') {
      // Legacy: If no details saved, create single item from total
      this.people.forEach(person => {
        const amount = payment.splitAmong[person.id] || 0;
        if (amount > 0) {
          this.customSplitItems[person.id] = [{
            description: 'Item',
            amount: amount
          }];
        } else {
          this.customSplitItems[person.id] = [];
        }
      });
    }
  }

  cancelEdit() {
    this.resetForm();
  }

  resetForm() {
    this.editingPayment = null;
    this.paymentForm = {
      name: '',
      amount: 0,
      paidBy: 0,
      splitType: 'equal',
      splitAmong: {}
    };
    
    this.people.forEach(person => {
      this.customSplitItems[person.id] = [];
    });
    
    this.initializeSplitAmong();
  }

  removePayment(id: number) {
    this.payments = this.payments.filter(p => p.id !== id);
    this.storage.updateEventData({ payments: this.payments });
  }

  getPersonName(id: number): string {
    return this.people.find(p => p.id == id)?.name || 'Unknown';
  }

  getEqualSplitCount(payment: Payment): number {
    return Object.values(payment.splitAmong).filter(v => v > 0).length;
  }

  // Helper method to calculate total from custom split items
  getPersonTotalFromDetails(items: CustomSplitItem[]): number {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  back() {
    this.storage.updateEventData({ currentStep: 2 });
    this.router.navigate(['/people']);
  }

  next() {
    if (this.payments.length > 0) {
      this.storage.updateEventData({ currentStep: 4 });
      this.router.navigate(['/summary']);
    }
  }
}