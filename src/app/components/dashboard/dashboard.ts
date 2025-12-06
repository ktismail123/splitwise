// dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface EventSummary {
  eventName: string;
  currency: string;
  totalAmount: number;
  peopleCount: number;
  paymentsCount: number;
  date: string;
  id: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  events: EventSummary[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    // Load all events from localStorage
    const keys = Object.keys(localStorage);
    const eventKeys = keys.filter(key => key.startsWith('settlement_event_'));
    
    this.events = eventKeys.map(key => {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      const totalAmount = data.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
      
      return {
        eventName: data.eventName || 'Untitled Event',
        currency: data.currency || 'USD',
        totalAmount: totalAmount,
        peopleCount: data.people?.length || 0,
        paymentsCount: data.payments?.length || 0,
        date: this.extractDateFromKey(key),
        id: key
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  extractDateFromKey(key: string): string {
    // Extract timestamp from key like 'settlement_event_1234567890'
    const timestamp = key.split('_').pop();
    return timestamp ? new Date(parseInt(timestamp)).toISOString() : new Date().toISOString();
  }

  viewEvent(eventId: string) {
    // Navigate to summary view for this event
    this.router.navigate(['/summary'], { queryParams: { eventId } });
  }

  deleteEvent(eventId: string, eventName: string) {
    if (confirm(`Are you sure you want to delete "${eventName}"?`)) {
      localStorage.removeItem(eventId);
      this.loadEvents();
    }
  }

  createNewEvent() {
    this.router.navigate(['/event']);
  }

  exportEvent(eventId: string) {
    const data = localStorage.getItem(eventId);
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${eventId}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  }
}