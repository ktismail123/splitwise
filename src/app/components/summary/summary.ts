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
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(0, 0, 210, 50, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('SETTLEMENT REPORT', 105, 25, { align: 'center' });
    
    // Event name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(this.eventName, 105, 38, { align: 'center' });
    
    // Date
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 105, 45, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos = 60;

    // ========== EVENT SUMMARY BOX ==========
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, yPos, 180, 30, 2, 2, 'FD');
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('EVENT SUMMARY', 20, yPos + 9);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    
    // Left column
    doc.setFont('helvetica', 'bold');
    doc.text('Currency:', 20, yPos + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(this.currency, 50, yPos + 18);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Participants:', 20, yPos + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(this.people.length.toString(), 50, yPos + 25);
    
    // Right column
    doc.setFont('helvetica', 'bold');
    doc.text('Total Expenses:', 110, yPos + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`${this.currency} ${this.totalAmount.toFixed(2)}`, 150, yPos + 18);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Payments:', 110, yPos + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(this.payments.length.toString(), 150, yPos + 25);
    
    yPos += 40;

    // ========== SETTLEMENT INSTRUCTIONS TABLE ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('WHO OWES WHOM', 15, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 7;

    if (this.settlements.length === 0) {
      doc.setFillColor(220, 252, 231);
      doc.setDrawColor(134, 239, 172);
      doc.roundedRect(15, yPos, 180, 20, 2, 2, 'FD');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text('✓ All Settled! No payments needed.', 105, yPos + 13, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 25;
    } else {
      const settlementData = this.settlements.map((settlement, index) => [
        (index + 1).toString(),
        `${settlement.from} pays ${settlement.to}`,
        `${this.currency} ${settlement.amount.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Payment Details', 'Amount']],
        body: settlementData,
        theme: 'grid',
        headStyles: {
          fillColor: [22, 163, 74],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 10,
          textColor: [31, 41, 55]
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 125, halign: 'left' },
          2: { cellWidth: 45, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] }
        },
        margin: { left: 15, right: 15 },
        alternateRowStyles: {
          fillColor: [240, 253, 244]
        },
        styles: {
          lineColor: [229, 231, 235],
          lineWidth: 0.5,
          cellPadding: 6
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    // ========== PAYMENT DETAILS TABLE ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('PAYMENT DETAILS', 15, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 7;

    const paymentData = this.payments.map((payment, index) => {
      const paidById = typeof payment.paidBy === 'string' ? parseInt(payment.paidBy) : payment.paidBy;
      return [
        (index + 1).toString(),
        payment.name,
        this.getPersonName(paidById),
        `${this.currency} ${payment.amount.toFixed(2)}`,
        payment.splitType === 'equal' ? 'Equal' : 'Custom'
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Description', 'Paid By', 'Amount', 'Split']],
      body: paymentData,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [31, 41, 55]
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 65, halign: 'left' },
        2: { cellWidth: 45, halign: 'left' },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 25, halign: 'center', fontSize: 8 }
      },
      margin: { left: 15, right: 15 },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      styles: {
        cellPadding: 5,
        lineColor: [229, 231, 235],
        lineWidth: 0.1
      }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    // ========== INDIVIDUAL TOTALS TABLE ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('INDIVIDUAL TOTALS', 15, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 7;

    const individualData = this.people.map((person, index) => {
      const total = this.getPersonTotal(person.id);
      return [
        (index + 1).toString(),
        person.name,
        `${this.currency} ${total.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Participant', 'Total Spent']],
      body: individualData,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [31, 41, 55]
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 120, halign: 'left' },
        2: { cellWidth: 50, halign: 'right', fontStyle: 'bold', textColor: [79, 70, 229] }
      },
      margin: { left: 15, right: 15 },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      styles: {
        cellPadding: 5,
        lineColor: [229, 231, 235],
        lineWidth: 0.1
      }
    });

    // ========== FOOTER ==========
    const pageCount = doc.internal.pages.length - 1;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(229, 231, 235);
      doc.line(15, 282, 195, 282);
      
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text('Powered by Zettly App', 15, 287);
      doc.text(`Page ${i} of ${pageCount}`, 195, 287, { align: 'right' });
    }

    // ========== SAVE PDF ==========
    const fileName = `${this.eventName.replace(/\s+/g, '_')}_Settlement_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  async downloadAsImage() {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '600px';
    container.style.fontFamily = 'Arial, sans-serif';
    
    container.innerHTML = `
      <div style="background: #ffffff; padding: 30px;">
        
        <!-- Header -->
        <div style="background: #6366f1; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: bold; color: #ffffff; margin: 0 0 8px;">${this.eventName}</h1>
          <div style="font-size: 14px; color: rgba(255,255,255,0.9);">
            Total: ${this.currency} ${this.totalAmount.toFixed(2)} | ${this.people.length} people | ${new Date().toLocaleDateString()}
          </div>
        </div>

        <!-- Settlements Table -->
        ${this.settlements.length === 0 ? `
          <div style="background: #f0fdf4; border: 2px solid #10b981; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: #10b981;">✓ All Settled!</div>
          </div>
        ` : `
          <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">#</th>
                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">From</th>
                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">To</th>
                <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${this.settlements.map((settlement, index) => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 14px; font-size: 14px; color: #6b7280;">${index + 1}</td>
                  <td style="padding: 14px; font-size: 14px; font-weight: 600; color: #111827;">${settlement.from}</td>
                  <td style="padding: 14px; font-size: 14px; font-weight: 600; color: #111827;">${settlement.to}</td>
                  <td style="padding: 14px; font-size: 15px; font-weight: bold; color: #10b981; text-align: right;">${this.currency} ${settlement.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- Footer -->
        <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #9ca3af;">
          Powered by Zettly App
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