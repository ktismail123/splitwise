// First, install the required packages:
// npm install jspdf jspdf-autotable html2canvas
// npm install --save-dev @types/jspdf @types/html2canvas

import { Component } from '@angular/core';
import { Payment, Person, Settlement } from '../../models/settlement.model';
import { StorageService } from '../../services/storage.service';
import { CalculationService } from '../../services/calculation.service';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { CommonModule } from '@angular/common';

// Add this type declaration
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

@Component({
  selector: 'app-summary',
  imports: [CommonModule],
  templateUrl: './summary.html',
  styleUrl: './summary.scss'
})
export class Summary {
  eventName = '';
  currency = 'USD';
  people: Person[] = [];
  payments: Payment[] = [];
  settlements: Settlement[] = [];
  totalAmount = 0;

  constructor(
    private storage: StorageService,
    private calculation: CalculationService,
    private router: Router
  ) {}

  ngOnInit() {
    const data = this.storage.loadData();
    this.eventName = data.eventName;
    this.currency = data.currency;
    this.people = data.people;
    this.payments = data.payments;
    
    this.settlements = this.calculation.calculateSettlements(this.people, this.payments);
    this.totalAmount = this.calculation.getTotalAmount(this.payments);
  }

  getPersonName(id: number | string): string {
    const numId = typeof id === 'string' ? parseInt(id) : id;
    return this.people.find(p => p.id === numId)?.name || 'Unknown';
  }

  getPersonTotal(personId: number): number {
    let total = 0;
    
    this.payments.forEach(payment => {
      const paidById = typeof payment.paidBy === 'string' ? parseInt(payment.paidBy) : payment.paidBy;
      
      // Add amount paid by this person
      if (paidById === personId) {
        total += payment.amount;
      }
      
      // Subtract amount owed by this person
      if (payment.splitAmong[personId]) {
        if (payment.splitType === 'equal') {
          const splitCount = Object.values(payment.splitAmong).filter(v => v === 1).length;
          total -= payment.amount / splitCount;
        } else {
          total -= payment.splitAmong[personId] || 0;
        }
      }
    });
    
    return total;
  }

downloadPDF() {
  const doc = new jsPDF();
  let yPos = 20;

  // ========== HEADER SECTION ==========
  doc.setFillColor(34, 197, 94); // Green-500
  doc.rect(0, 0, 210, 45, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('SETTLEMENT REPORT', 105, 20, { align: 'center' });
  
  // Event name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(this.eventName, 105, 32, { align: 'center' });
  
  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  }), 105, 40, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  yPos = 55;

  // ========== EVENT SUMMARY ==========
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(15, yPos, 180, 25, 3, 3, 'FD');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(75, 85, 99);
  doc.text('Total Amount:', 25, yPos + 10);
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(`${this.currency} ${this.totalAmount.toFixed(2)}`, 25, yPos + 18);
  
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text('Participants:', 130, yPos + 10);
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(this.people.length.toString(), 130, yPos + 18);
  
  yPos += 35;

  // ========== SETTLEMENTS TABLE ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Settlements', 15, yPos);
  yPos += 8;

  if (this.settlements.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(15, yPos, 180, 18, 2, 2, 'FD');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text('✓ All Settled - No payments needed', 105, yPos + 11, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPos += 23;
  } else {
    const settlementData = this.settlements.map((settlement, index) => [
      settlement.from,
      '→',
      settlement.to,
      `${this.currency} ${settlement.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['From', '', 'To', 'Amount']],
      body: settlementData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 250, 251],
        textColor: [107, 114, 128],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [17, 24, 39]
      },
      columnStyles: {
        0: { cellWidth: 65, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 20, halign: 'center', textColor: [156, 163, 175] },
        2: { cellWidth: 65, halign: 'left', fontStyle: 'bold' },
        3: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [34, 197, 94] }
      },
      margin: { left: 15, right: 15 },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if we need a new page
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  // ========== PAYMENT DETAILS ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Payment Details', 15, yPos);
  yPos += 8;

  const paymentData = this.payments.map((payment, index) => {
    const paidById = typeof payment.paidBy === 'string' ? parseInt(payment.paidBy) : payment.paidBy;
    return [
      payment.name,
      this.getPersonName(paidById),
      `${this.currency} ${payment.amount.toFixed(2)}`,
      payment.splitType === 'equal' ? 'Equal' : 'Custom'
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Paid By', 'Amount', 'Split']],
    body: paymentData,
    theme: 'striped',
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [107, 114, 128],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [17, 24, 39]
    },
    columnStyles: {
      0: { cellWidth: 70, halign: 'left' },
      1: { cellWidth: 50, halign: 'left' },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 30, halign: 'center', fontSize: 8 }
    },
    margin: { left: 15, right: 15 },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  // ========== INDIVIDUAL TOTALS ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Individual Balances', 15, yPos);
  yPos += 8;

  const individualData = this.people.map((person, index) => {
    const total = this.getPersonTotal(person.id);
    return [
      person.name,
      `${this.currency} ${total.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Participant', 'Balance']],
    body: individualData,
    theme: 'striped',
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [107, 114, 128],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [17, 24, 39]
    },
    columnStyles: {
      0: { cellWidth: 140, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold', textColor: [34, 197, 94] }
    },
    margin: { left: 15, right: 15 },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    }
  });

  // ========== FOOTER ==========
  const pageCount = doc.internal.pages.length - 1;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(229, 231, 235);
    doc.line(15, 282, 195, 282);
    
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'normal');
    doc.text('Powered by Zettly', 15, 287);
    doc.text(`Page ${i} of ${pageCount}`, 195, 287, { align: 'right' });
  }

  // ========== SAVE PDF ==========
  const fileName = `${this.eventName.replace(/\s+/g, '_')}_Settlement.pdf`;
  doc.save(fileName);
}

async downloadAsImage() {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '600px';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  
  container.innerHTML = `
    <div style="background: #ffffff; padding: 40px;">
      
      <!-- Header -->
      <div style="border-bottom: 3px solid #22c55e; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 8px;">${this.eventName}</h1>
        <div style="font-size: 14px; color: #6b7280;">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <!-- Summary -->
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between;">
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Amount</div>
            <div style="font-size: 24px; font-weight: 700; color: #111827;">${this.currency} ${this.totalAmount.toFixed(2)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Participants</div>
            <div style="font-size: 24px; font-weight: 700; color: #111827;">${this.people.length}</div>
          </div>
        </div>
      </div>

      <!-- Settlements -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 16px;">Settlements</h2>
        
        ${this.settlements.length === 0 ? `
          <div style="text-align: center; padding: 40px 20px; background: #f9fafb; border-radius: 8px;">
            <div style="font-size: 16px; font-weight: 600; color: #22c55e; margin-bottom: 4px;">✓ All Settled</div>
            <div style="font-size: 14px; color: #6b7280;">No payments needed</div>
          </div>
        ` : `
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">From</th>
                <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">→</th>
                <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">To</th>
                <th style="padding: 12px 8px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${this.settlements.map((settlement, index) => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 16px 8px; font-size: 15px; font-weight: 600; color: #111827;">${settlement.from}</td>
                  <td style="padding: 16px 8px; text-align: center; color: #9ca3af;">→</td>
                  <td style="padding: 16px 8px; font-size: 15px; font-weight: 600; color: #111827;">${settlement.to}</td>
                  <td style="padding: 16px 8px; font-size: 16px; font-weight: 700; color: #22c55e; text-align: right;">${this.currency} ${settlement.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <div style="font-size: 11px; color: #9ca3af;">Powered by Zettly</div>
      </div>

    </div>
  `;
  
  document.body.appendChild(container);
  
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      width: 600,
      windowWidth: 600
    });
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${this.eventName.replace(/\s+/g, '_')}_Settlement.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
    
  } catch (error) {
    console.error('Error generating image:', error);
    alert('Failed to generate image. Please try again.');
  } finally {
    document.body.removeChild(container);
  }
}

  back() {
    this.storage.updateEventData({ currentStep: 3 });
    this.router.navigate(['/payments']);
  }

  startNew() {
    if (confirm('Are you sure you want to start a new event? Current data will be cleared.')) {
      this.storage.clearData();
      this.router.navigate(['/']);
    }
  }
}