import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaypointEditorComponent } from './waypoint-editor.component';

describe('WaypointEditorComponent', () => {
  let component: WaypointEditorComponent;
  let fixture: ComponentFixture<WaypointEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaypointEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WaypointEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize createWaypoint with optional coordinates', () => {
    component.createWaypoint(undefined, { lat: '33.123', lon: '-118.456' });
    expect(component.wpFormData).toEqual({
      name: '',
      lat: '33.123',
      lon: '-118.45600'
    });
    expect(component.shown).toBeTrue();
    expect(component.editing).toBeFalse();
  });

  it('should normalize longitude when it is out of bounds', () => {
    // -239.72631 -> -239.72631 + 360 = 120.27369
    component.createWaypoint(undefined, { lat: '33.123', lon: '-239.72631' });
    expect(component.wpFormData).toEqual({
      name: '',
      lat: '33.123',
      lon: '120.27369'
    });

    component.createWaypoint(undefined, { lat: '33.123', lon: '190.5' });
    expect(component.wpFormData).toEqual({
      name: '',
      lat: '33.123',
      lon: '-169.50000'
    });

    component.createWaypoint(undefined, { lat: '33.123', lon: '540' });
    expect(component.wpFormData).toEqual({
      name: '',
      lat: '33.123',
      lon: '180.00000'
    });
  });
});
