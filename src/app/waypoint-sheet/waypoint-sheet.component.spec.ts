import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaypointSheetComponent } from './waypoint-sheet.component';
import { Waypoint } from '../waypoint';
import { NavInfoDraft } from '../nav-info-draft';

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
    component.waypointEditor = jasmine.createSpyObj('WaypointEditorComponent', [
      'createWaypoint'
    ]);
    spyOn(component, 'getDraftWaypoints').and.returnValue(undefined);
    component.draftAddWaypointWithCoords('33.123', '-118.456');
    expect(component.waypointEditor.createWaypoint).toHaveBeenCalledWith(
      jasmine.any(Function),
      { lat: '33.123', lon: '-118.456' }
    );
  });

  describe('map marker updates', () => {
    let draftWaypoints: NavInfoDraft;
    let mapDiv: HTMLDivElement;

    beforeEach(() => {
      draftWaypoints = new NavInfoDraft(
        [
          new Waypoint({
            id: 1,
            name: 'TEST',
            lat_deg: 33,
            lat_min: 12300,
            lat_dir: 'N',
            lon_deg: 118,
            lon_min: 45600,
            lon_dir: 'W'
          })
        ],
        [],
        { number: 200 } as any,
        { numRoutes: 10, numWaypointsPerRoute: 50, bytesPerRoute: 0 } as any
      );

      component.deviceMgr.configSession.config.next({
        draftWaypoints: draftWaypoints
      } as any);

      component.shown = true;
      fixture.detectChanges();

      mapDiv = document.createElement('div');
      mapDiv.id = 'waypoint-map';
      mapDiv.style.width = '500px';
      mapDiv.style.height = '500px';
      document.body.appendChild(mapDiv);

      component['initMap']();
    });

    afterEach(() => {
      document.body.removeChild(mapDiv);
    });

    it('should update map markers WITHOUT fitting bounds when adding waypoint from map', () => {
      expect(component['markers'].size).toBe(1);

      const originalBounds = component['map']!.getBounds();

      component.draftAddWaypointWithCoords('34.0', '-118.0');

      component.waypointEditor.wpFormData!.name = 'WP1';
      component.waypointEditor.onSubmit({} as any);

      expect(draftWaypoints.waypoints.length).toBe(2);
      expect(component['markers'].size).toBe(2);

      const newBounds = component['map']!.getBounds();
      expect(newBounds.equals(originalBounds)).toBeTrue();
    });

    it('should update map markers AND fit bounds when adding waypoint from table', () => {
      expect(component['markers'].size).toBe(1);

      const originalBounds = component['map']!.getBounds();

      component.draftAddWaypoint();

      component.waypointEditor.wpFormData!.name = 'WP2';
      component.waypointEditor.wpFormData!.lat = '34.0';
      component.waypointEditor.wpFormData!.lon = '-118.0';
      component.waypointEditor.onSubmit({} as any);

      expect(draftWaypoints.waypoints.length).toBe(2);
      expect(component['markers'].size).toBe(2);

      const newBounds = component['map']!.getBounds();
      expect(newBounds.equals(originalBounds)).toBeFalse();
    });
  });
});
