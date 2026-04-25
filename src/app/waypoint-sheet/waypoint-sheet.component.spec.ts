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

  it('should select a waypoint', () => {
    const mockWp = { wp: { name: 'TEST' } } as any;
    component.selectWaypoint(mockWp);
    expect(component.selectedWaypoint).toBe(mockWp);
  });

  it('should pass coordinates to waypoint editor when adding waypoint from map', () => {
    component.waypointEditor = jasmine.createSpyObj('WaypointEditorComponent', ['createWaypoint']);
    spyOn(component, 'getDraftWaypoints').and.returnValue(undefined);
    component.draftAddWaypointWithCoords('33.123', '-118.456');
    expect(component.waypointEditor.createWaypoint).toHaveBeenCalledWith(
      jasmine.any(Function),
      { lat: '33.123', lon: '-118.456' }
    );
  });
});
