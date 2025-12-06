import { Component } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-event-details',
  imports: [FormsModule, CommonModule],
  templateUrl: './event-details.html',
  styleUrl: './event-details.scss'
})
export class EventDetails {
eventName = '';
  currency = 'USD';

  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  ngOnInit() {
    const data = this.storage.loadData();
    this.eventName = data.eventName;
    this.currency = data.currency;
    console.log(this.currency);
    
  }

  next() {
    if (this.eventName.trim()) {
      this.storage.updateEventData({
        eventName: this.eventName,
        currency: this.currency,
        currentStep: 2
      });
      this.router.navigate(['/people']);
    }
  }

}
