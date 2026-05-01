import { Component, OnInit, OnDestroy } from '@angular/core';
import { DevicemgrService } from '../devicemgr.service';
import { Subscription } from 'rxjs';
import { LocusSession } from '../gps';
import { initMapLayers } from '../util/map-layers';
import * as L from 'leaflet';
import { saveAs } from 'file-saver';
import {
  LucideRoute,
  LucideDownload,
  LucideTrash2,
  LucideX
} from '@lucide/angular';

@Component({
  selector: 'gps-log-sheet',
  templateUrl: './gps-log-sheet.component.html',
  styleUrl: './gps-log-sheet.component.css',
  imports: [LucideRoute, LucideDownload, LucideTrash2, LucideX]
})
export class GpsLogSheetComponent implements OnInit, OnDestroy {
  shown = false;
  configSubscription?: Subscription;
  private map?: L.Map;
  private trackLine?: L.Polyline;
  selectedSession: LocusSession | null = null;

  constructor(public deviceMgr: DevicemgrService) {}

  ngOnInit() {
    this.deviceMgr.configSession.deviceTaskState$.subscribe((state) => {
      if (state === 'gpslog-view') {
        if (!this.shown) {
          this.shown = true;
          this.selectedSession = null;
          setTimeout(() => {
            this.initMap();
            // Auto-select first session if available
            const config = this.deviceMgr.configSession.config.getValue();
            if (
              config.gpsLogData &&
              config.gpsLogData.locus.sessions.length > 0
            ) {
              this.selectSession(config.gpsLogData.locus.sessions[0]);
            }
          }, 0);
        }
      } else {
        this.shown = false;
        if (this.map) {
          this.map.remove();
          this.map = undefined;
        }
        this.trackLine = undefined;
      }
    });

    this.configSubscription = this.deviceMgr.configSession.config.subscribe(
      (config) => {
        if (
          this.shown &&
          config.gpsLogData &&
          !this.selectedSession &&
          config.gpsLogData.locus.sessions.length > 0
        ) {
          this.selectSession(config.gpsLogData.locus.sessions[0]);
        }
      }
    );
  }

  ngOnDestroy() {
    this.configSubscription?.unsubscribe();
  }

  private initMap() {
    const mapEl = document.getElementById('gps-log-map');
    if (!mapEl) return;

    this.map = L.map('gps-log-map', {
      worldCopyJump: true
    });

    initMapLayers(this.map);

    if (this.selectedSession) {
      this.updateTrackOnMap();
    } else {
      this.map.setView([0, 0], 2);
    }

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  selectSession(session: LocusSession) {
    this.selectedSession = session;
    this.updateTrackOnMap();
  }

  private updateTrackOnMap() {
    if (!this.map || !this.selectedSession) return;

    if (this.trackLine) {
      this.trackLine.remove();
    }

    const latLngs = this.selectedSession.waypoints.map(
      (wp) => [wp.lat, wp.lon] as L.LatLngExpression
    );
    this.trackLine = L.polyline(latLngs, { color: '#007bff', weight: 4 }).addTo(
      this.map
    );

    const bounds = this.trackLine.getBounds();
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [30, 30] });
    }
  }

  formatTime(utc: number): string {
    const timezone =
      this.deviceMgr.configSession.config.getValue().gpsLogData?.timezone;
    const date = new Date(utc * 1000);

    if (timezone) {
      // Manual adjustment for local time display
      const localDate = new Date(
        date.getTime() + timezone.offsetMinutes * 60000
      );

      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: !timezone.is24h,
        timeZone: 'UTC'
      };
      return localDate.toLocaleString(undefined, options);
    }

    return date.toLocaleString();
  }

  formatDistance(nm: number): string {
    return `${nm.toFixed(2)} nm`;
  }

  formatSpeed(knots: number): string {
    return `${knots.toFixed(1)} kn`;
  }

  downloadSession(session: LocusSession) {
    const timezone =
      this.deviceMgr.configSession.config.getValue().gpsLogData?.timezone;
    const date = new Date(session.startTime * 1000);
    let dateStr = date.toISOString().split('T')[0];

    if (timezone) {
      const localDate = new Date(
        date.getTime() + timezone.offsetMinutes * 60000
      );
      dateStr = localDate.toISOString().split('T')[0];
    }

    const gpx = session.getGpx();
    const blob = new Blob(gpx, { type: 'application/xml' });
    saveAs(blob, `gpslog_${dateStr}.gpx`);
  }

  downloadAll() {
    const locus =
      this.deviceMgr.configSession.config.getValue().gpsLogData?.locus;
    if (!locus) return;
    const gpx = locus.getGpx();
    const blob = new Blob(gpx, { type: 'application/xml' });
    saveAs(blob, `gpslog_all.gpx`);
  }

  async clearLogs() {
    if (
      confirm(
        'Are you sure you want to delete all GPS logs from the device? This cannot be undone.'
      )
    ) {
      await this.deviceMgr.configSession.clearGpsLog();
    }
  }

  close() {
    this.deviceMgr.configSession.cancelGpsLogView();
  }

  getStoragePercent(): number {
    const data = this.deviceMgr.configSession.config.getValue().gpsLogData;
    if (!data || !data.storageStatus.total) return 0;
    // Note: total might be 0 if not returned by PMTK, we might need a default or hardcoded total for models.
    // For now let's assume 1MB or similar if unknown, or just show bytes if total is 0.
    return (data.storageStatus.used / data.storageStatus.total) * 100;
  }
}
