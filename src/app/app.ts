import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { StorageService } from './services/storage.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('angular20');
  currentStep = 1;

  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.storage.eventData$.subscribe(data => {
      this.currentStep = data.currentStep;
    });

    const data = this.storage.loadData();
    const routes = ['/', '/people', '/payments', '/summary'];
    this.router.navigate([routes[data.currentStep - 1]]);
  }
}
