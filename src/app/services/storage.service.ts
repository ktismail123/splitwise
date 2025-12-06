// // ============================================
// // services/storage.service.ts
// // ============================================
// import { Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { EventData } from '../models/settlement.model';

// @Injectable({
//   providedIn: 'root'
// })
// export class StorageService {
//   private readonly STORAGE_KEY = 'settlementReportData';
//   private eventDataSubject = new BehaviorSubject<EventData>(this.getInitialData());
  
//   eventData$ = this.eventDataSubject.asObservable();

//   private getInitialData(): EventData {
//     return {
//       eventName: '',
//       currency: 'AED',
//       people: [],
//       payments: [],
//       currentStep: 1
//     };
//   }

//   loadData(): EventData {
//     const saved = localStorage.getItem(this.STORAGE_KEY);
//     if (saved) {
//       try {
//         const data = JSON.parse(saved);
//         this.eventDataSubject.next(data);
//         return data;
//       } catch (e) {
//         console.error('Error loading data:', e);
//       }
//     }
//     return this.getInitialData();
//   }

//   saveData(data: EventData): void {
//     localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
//     this.eventDataSubject.next(data);
//   }

//   clearData(): void {
//     localStorage.removeItem(this.STORAGE_KEY);
//     this.eventDataSubject.next(this.getInitialData());
//   }

//   updateEventData(updates: Partial<EventData>): void {
//     const current = this.eventDataSubject.value;
//     const updated = { ...current, ...updates };
//     this.saveData(updated);
//   }

  
// }

// storage.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EventData } from '../models/settlement.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'settlementReportData';
  private readonly HISTORY_PREFIX = 'settlement_event_';
  
  private eventDataSubject = new BehaviorSubject<EventData>(this.getInitialData());
  eventData$ = this.eventDataSubject.asObservable();

  private getInitialData(): EventData {
    return {
      eventName: '',
      currency: 'AED',
      people: [],
      payments: [],
      currentStep: 1
    };
  }

  // ========== CURRENT WORKING EVENT ==========
  
  loadData(): EventData {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.eventDataSubject.next(data);
        return data;
      } catch (e) {
        console.error('Error loading data:', e);
      }
    }
    return this.getInitialData();
  }

  saveData(data: EventData): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    this.eventDataSubject.next(data);
  }

  clearData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.eventDataSubject.next(this.getInitialData());
  }

  updateEventData(updates: Partial<EventData>): void {
    const current = this.eventDataSubject.value;
    const updated = { ...current, ...updates };
    this.saveData(updated);
  }

  // ========== EVENT HISTORY ==========

  /**
   * Save completed event to history
   * Returns the generated event ID
   */
  saveEventToHistory(eventData: EventData): string {
    const eventId = `${this.HISTORY_PREFIX}${Date.now()}`;
    const eventWithMetadata = {
      ...eventData,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(eventId, JSON.stringify(eventWithMetadata));
    return eventId;
  }

  /**
   * Load specific event from history by ID
   */
  loadEventFromHistory(eventId: string): EventData | null {
    const data = localStorage.getItem(eventId);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error loading event from history:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * Get all saved events from history
   * Returns sorted by date (newest first)
   */
  getAllEvents(): Array<{ id: string; data: EventData }> {
    const keys = Object.keys(localStorage);
    const eventKeys = keys.filter(key => key.startsWith(this.HISTORY_PREFIX));
    
    const events = eventKeys
      .map(key => {
        const data = localStorage.getItem(key);
        if (!data) return null;
        
        try {
          return {
            id: key,
            data: JSON.parse(data) as EventData
          };
        } catch (e) {
          console.error('Error parsing event:', e);
          return null;
        }
      })
      .filter((event): event is { id: string; data: EventData } => event !== null);

    // Sort by timestamp in ID (newest first)
    return events.sort((a, b) => {
      const timeA = parseInt(a.id.split('_').pop() || '0');
      const timeB = parseInt(b.id.split('_').pop() || '0');
      return timeB - timeA;
    });
  }

  /**
   * Delete event from history
   */
  deleteEvent(eventId: string): void {
    localStorage.removeItem(eventId);
  }

  /**
   * Load event from history to current working event
   * Useful for viewing or editing past events
   */
  loadEventToCurrent(eventId: string): void {
    const eventData = this.loadEventFromHistory(eventId);
    if (eventData) {
      this.saveData(eventData);
    }
  }

  /**
   * Export event data as JSON file
   */
  exportEventAsJSON(eventId: string): void {
    const eventData = this.loadEventFromHistory(eventId);
    if (eventData) {
      const blob = new Blob([JSON.stringify(eventData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${eventData.eventName.replace(/\s+/g, '_')}_${eventId}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Import event from JSON file
   */
  importEventFromJSON(jsonData: string): string | null {
    try {
      const eventData = JSON.parse(jsonData) as EventData;
      return this.saveEventToHistory(eventData);
    } catch (e) {
      console.error('Error importing event:', e);
      return null;
    }
  }

  /**
   * Get total count of saved events
   */
  getEventCount(): number {
    const keys = Object.keys(localStorage);
    return keys.filter(key => key.startsWith(this.HISTORY_PREFIX)).length;
  }

  /**
   * Clear all event history
   */
  clearAllHistory(): void {
    const keys = Object.keys(localStorage);
    const eventKeys = keys.filter(key => key.startsWith(this.HISTORY_PREFIX));
    eventKeys.forEach(key => localStorage.removeItem(key));
  }
}