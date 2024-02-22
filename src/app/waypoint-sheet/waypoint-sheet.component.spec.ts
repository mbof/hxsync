import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaypointSheetComponent } from './waypoint-sheet.component';

describe('WaypointSheetComponent', () => {
  let component: WaypointSheetComponent;
  let fixture: ComponentFixture<WaypointSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaypointSheetComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(WaypointSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
