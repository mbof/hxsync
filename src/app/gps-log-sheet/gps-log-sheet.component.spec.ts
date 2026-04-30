import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GpsLogSheetComponent } from './gps-log-sheet.component';
import { DevicemgrService } from '../devicemgr.service';
import { BehaviorSubject } from 'rxjs';
import { Config } from '../config-modules/device-configs';

describe('GpsLogSheetComponent', () => {
  let component: GpsLogSheetComponent;
  let fixture: ComponentFixture<GpsLogSheetComponent>;
  let mockDeviceMgr: any;
  let configSubject: BehaviorSubject<Config>;

  beforeEach(async () => {
    configSubject = new BehaviorSubject<Config>({});
    mockDeviceMgr = {
      configSession: {
        deviceTaskState$: new BehaviorSubject('idle'),
        config: configSubject
      }
    };

    await TestBed.configureTestingModule({
      imports: [GpsLogSheetComponent],
      providers: [
        { provide: DevicemgrService, useValue: mockDeviceMgr }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GpsLogSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('formatTime', () => {
    it('should format UTC time when no timezone is provided', () => {
      const utc = 1714464000; // 2024-04-30T08:00:00Z
      const date = new Date(utc * 1000);
      expect(component.formatTime(utc)).toBe(date.toLocaleString());
    });

    it('should format time with positive offset (UTC+05:30)', () => {
      configSubject.next({
        gpsLogData: {
          locus: {} as any,
          storageStatus: { used: 0, total: 0 },
          timezone: { isLocal: true, is24h: true, offsetMinutes: 330 }
        }
      });
      
      const utc = 1714464000; // 2024-04-30T08:00:00Z
      const result = component.formatTime(utc);
      // 08:00 + 05:30 = 13:30
      expect(result).toContain('13:30');
      expect(result).toContain('2024');
    });

    it('should format time with negative offset (UTC-07:00) and 12h format', () => {
      configSubject.next({
        gpsLogData: {
          locus: {} as any,
          storageStatus: { used: 0, total: 0 },
          timezone: { isLocal: true, is24h: false, offsetMinutes: -420 }
        }
      });
      
      const utc = 1714464000; // 2024-04-30T08:00:00Z
      const result = component.formatTime(utc);
      // 08:00 - 07:00 = 01:00
      expect(result).toMatch(/01:00\s*(AM|am)/);
    });
  });
});
