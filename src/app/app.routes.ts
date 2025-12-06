import { Routes } from '@angular/router';
import { EventDetails } from './components/event-details/event-details';
import { AddPeople } from './components/add-people/add-people';
import { AddPayments } from './components/add-payments/add-payments';
import { Summary } from './components/summary/summary';
import { DashboardComponent } from './components/dashboard/dashboard';


export const routes: Routes = [
  {path: '', redirectTo : 'dashboard', pathMatch: 'full'},
  { path: 'dashboard', component: DashboardComponent },
  { path: 'event', component: EventDetails },
  { path: 'people', component: AddPeople },
  { path: 'payments', component: AddPayments },
  { path: 'summary', component: Summary },
  { path: '**', redirectTo: '' }
];