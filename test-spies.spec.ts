import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WaypointSheetComponent } from './src/app/waypoint-sheet/waypoint-sheet.component';
import { Waypoint } from './src/app/waypoint';
import { NavInfoDraft } from './src/app/nav-info-draft';
import { DevicemgrService } from './src/app/devicemgr.service';

describe('WaypointSheetComponent (No Spies)', () => {
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

  it('works without spies for map', async () => {
    const realDraftWaypoints = new NavInfoDraft(
      [
        new Waypoint({
          id: 1, name: 'TEST',
          lat_deg: 33, lat_min: 12300, lat_dir: 'N',
          lon_deg: 118, lon_min: 45600, lon_dir: 'W'
        })
      ],
      [],
      { number: 200 } as any,
      { numRoutes: 10, numWaypointsPerRoute: 50, bytesPerRoute: 0 } as any
    );

    component.deviceMgr.configSession.config.next({
      draftWaypoints: realDraftWaypoints
    } as any);

    component.shown = true;
    fixture.detectChanges();

    const mapDiv = document.createElement('div');
    mapDiv.id = 'waypoint-map';
    mapDiv.style.width = '500px';
    mapDiv.style.height = '500px';
    document.body.appendChild(mapDiv);

    component['initMap']();

    expect(component['markers'].size).toBe(1);

    const originalBounds = component['map']!.getBounds();

    component.draftAddWaypointWithCoords('34.0', '-118.0');

    component.waypointEditor.wpFormData!.name = 'WP1';
    component.waypointEditor.onSubmit({} as any);

    expect(realDraftWaypoints.waypoints.length).toBe(2);
    expect(component['markers'].size).toBe(2);
    
    const newBounds = component['map']!.getBounds();
    expect(newBounds.equals(originalBounds)).toBeTrue();

    document.body.removeChild(mapDiv);
  });
});
