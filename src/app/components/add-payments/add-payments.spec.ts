import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPayments } from './add-payments';

describe('AddPayments', () => {
  let component: AddPayments;
  let fixture: ComponentFixture<AddPayments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPayments]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPayments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
