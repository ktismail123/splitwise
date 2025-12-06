import { Component } from '@angular/core';
import { Person } from '../../models/settlement.model';
import { StorageService } from '../../services/storage.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-people',
  imports: [FormsModule, CommonModule],
  templateUrl: './add-people.html',
  styleUrl: './add-people.scss'
})
export class AddPeople {
people: Person[] = [];
  newPersonName = '';

  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  ngOnInit() {
    const data = this.storage.loadData();
    this.people = data.people;
  }

  addPerson() {
    if (this.newPersonName.trim()) {
      this.people.push({
        id: Date.now(),
        name: this.newPersonName.trim()
      });
      this.storage.updateEventData({ people: this.people });
      this.newPersonName = '';
    }
  }

  removePerson(id: number) {
    this.people = this.people.filter(p => p.id !== id);
    this.storage.updateEventData({ people: this.people });
  }

  back() {
    this.storage.updateEventData({ currentStep: 1 });
    this.router.navigate(['/event']);
  }

  next() {
    if (this.people.length >= 2) {
      this.storage.updateEventData({ currentStep: 3 });
      this.router.navigate(['/payments']);
    }
  }
}
