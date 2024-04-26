import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MmsiSheetComponent } from './mmsi-sheet.component';

describe('MmsiSheetComponent', () => {
  let component: MmsiSheetComponent;
  let fixture: ComponentFixture<MmsiSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MmsiSheetComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MmsiSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
