import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusyStateModalComponent } from './busy-state-modal.component';

describe('BusyStateModalComponent', () => {
  let component: BusyStateModalComponent;
  let fixture: ComponentFixture<BusyStateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusyStateModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BusyStateModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
