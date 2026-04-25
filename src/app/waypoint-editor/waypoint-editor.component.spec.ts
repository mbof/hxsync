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
      lon: '-118.456'
    });
    expect(component.shown).toBeTrue();
    expect(component.editing).toBeFalse();
  });
});
