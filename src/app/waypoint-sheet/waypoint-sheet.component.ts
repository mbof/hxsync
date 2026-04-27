import { Component, ViewChild } from '@angular/core';
import { WaypointEditorComponent } from '../waypoint-editor/waypoint-editor.component';
import { Waypoint } from '../waypoint';
import { hex } from '../message';
import { DevicemgrService } from '../devicemgr.service';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';

@Component({
  selector: 'waypoint-sheet',
  templateUrl: './waypoint-sheet.component.html',
  styleUrl: './waypoint-sheet.component.css',
  imports: [WaypointEditorComponent]
})
export class WaypointSheetComponent {
  shown = false;
  @ViewChild(WaypointEditorComponent) waypointEditor!: WaypointEditorComponent;
  configSubscription?: Subscription;

  private map?: L.Map;
  private markers: Map<Waypoint, L.Marker> = new Map();
  selectedWaypoint: Waypoint | null = null;

  constructor(public deviceMgr: DevicemgrService) { }

  ngOnInit() {
    this.deviceMgr.configSession.deviceTaskState$.subscribe(
      (deviceTaskState) => {
        if (deviceTaskState == 'nav-edit' || deviceTaskState == 'nav-save') {
          if (!this.shown) {
            this.shown = true;
            setTimeout(() => this.initMap(), 0);
          }
        } else {
          this.shown = false;
          if (this.map) {
            this.map.remove();
            this.map = undefined;
          }
          this.markers.clear();
        }
      }
    );
    this.configSubscription = this.deviceMgr.configSession.config
      .asObservable()
      .subscribe(() => {
        if (this.shown) {
          this.updateMapMarkers();
        }
      });
  }

  private initMap() {
    if (!document.getElementById('waypoint-map')) return;

    this.map = L.map('waypoint-map', {
      worldCopyJump: true
    });

    // OpenStreetMap Base Layer
    const osmBase = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }
    );

    // OpenSeaMap Overlay
    const openSeaMap = L.tileLayer(
      'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
      {
        attribution:
          'Map data: &copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
      }
    );

    // NOAA WMS Layer
    const noaaLayer = L.tileLayer.wms(
      'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer',
      {
        format: 'image/png',
        transparent: true,
        attribution: 'NOAA Office of Coast Survey'
      }
    );

    osmBase.addTo(this.map);
    openSeaMap.addTo(this.map);
    noaaLayer.addTo(this.map);

    const baseMaps = {
      OpenStreetMap: osmBase
    };

    const overlayMaps = {
      OpenSeaMap: openSeaMap,
      'NOAA Charts': noaaLayer
    };

    L.control.layers(baseMaps, overlayMaps).addTo(this.map);

    this.map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      const latStr = e.latlng.lat.toFixed(5);
      const lonStr = e.latlng.lng.toFixed(5);

      const popupContent = document.createElement('div');
      popupContent.innerHTML =
        '<button style="padding: 5px 10px; cursor: pointer; border: none; background: #007bff; color: white; border-radius: 4px; font-weight: bold;">Add waypoint here</button>';

      popupContent.querySelector('button')?.addEventListener('click', () => {
        this.map?.closePopup();
        this.draftAddWaypointWithCoords(latStr, lonStr);
      });

      L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(this.map!);
    });

    this.updateMapMarkersAndFitBounds();

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  private updateMapMarkers(): L.LatLngBounds | undefined {
    if (!this.map) return;

    const waypoints = this.getDraftWaypoints()?.waypoints || [];

    // Remove old markers
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();

    const bounds = L.latLngBounds([]);

    waypoints.forEach((wp) => {
      const lat = wp.getLatDecimal();
      const lon = wp.getLonDecimal();
      if (lat !== undefined && lon !== undefined) {
        const customIcon = L.divIcon({
          className: 'waypoint-marker',
          html: `<div style="background-color: #007bff; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -9]
        });

        const marker = L.marker([lat, lon], { icon: customIcon }).addTo(
          this.map!
        );
        marker.bindPopup(`<b>${wp.wp.name}</b>`);

        marker.on('click', () => {
          this.selectWaypoint(wp);
        });

        this.markers.set(wp, marker);
        bounds.extend([lat, lon]);
      }
    });

    return bounds;
  }

  private updateMapMarkersAndFitBounds() {
    const bounds = this.updateMapMarkers();
    if (!this.map || !bounds) return;

    const waypoints = this.getDraftWaypoints()?.waypoints || [];
    if (waypoints.length > 0 && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [20, 20] });
    } else {
      this.map.setView([20, 0], 2);
    }
  }

  selectWaypoint(wp: Waypoint) {
    this.selectedWaypoint = wp;

    // Highlight table row (managed via template binding)
    const row = document.getElementById('wp-row-' + wp.wp.name);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Open marker popup
    const marker = this.markers.get(wp);
    if (marker && this.map) {
      marker.openPopup();
      this.map.setView(marker.getLatLng(), this.map.getZoom() || 13);
    }
  }

  getDraftWaypoints() {
    return this.deviceMgr.configSession.config.getValue().draftWaypoints;
  }
  draftEditWaypoint(wp: Waypoint) {
    const draftWaypoints = this.getDraftWaypoints();
    if (draftWaypoints) {
      this.waypointEditor.editWaypoint(wp, (wpFormData) => {
        draftWaypoints?.editWaypoint(
          wp,
          wpFormData.name,
          wpFormData.lat,
          wpFormData.lon
        );
        this.updateMapMarkersAndFitBounds();
      });
    }
  }
  draftDeleteWaypoint(wp: Waypoint) {
    const draftWaypoints = this.getDraftWaypoints();
    if (draftWaypoints) {
      draftWaypoints.deleteWaypoint(wp);
      this.updateMapMarkersAndFitBounds();
    }
  }
  draftAddWaypoint() {
    const draftWaypoints = this.getDraftWaypoints();
    this.waypointEditor.createWaypoint((wpFormData) => {
      draftWaypoints?.addWaypoint(wpFormData);
      this.updateMapMarkersAndFitBounds();
    });
  }
  draftAddWaypointWithCoords(lat: string, lon: string) {
    const draftWaypoints = this.getDraftWaypoints();
    this.waypointEditor.createWaypoint(
      (wpFormData) => {
        draftWaypoints?.addWaypoint(wpFormData);
        this.updateMapMarkers();
      },
      { lat, lon }
    );
  }
  draftCancel() {
    this.deviceMgr.configSession.cancelNavInfoDraft();
  }
  saveDraft() {
    this.deviceMgr.configSession.writeNavInfoDraft();
  }
  isPendingDraft() {
    return this.getDraftWaypoints()?.dirtyWaypoints;
  }
  hex = hex;
}
