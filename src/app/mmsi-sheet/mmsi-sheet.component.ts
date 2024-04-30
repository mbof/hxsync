import { Component } from '@angular/core';
import { DevicemgrService } from '../devicemgr.service';
import { ConfigSession, DeviceTaskState } from '../config-session';
import {
  NgForm,
  FormsModule,
  ReactiveFormsModule,
  FormControl
} from '@angular/forms';

@Component({
  selector: 'mmsi-sheet',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './mmsi-sheet.component.html',
  styleUrl: './mmsi-sheet.component.css'
})
export class MmsiSheetComponent {
  shown = false;
  configProtocol: ConfigSession;
  csvControl = new FormControl('Uninitialized');
  constructor(deviceMgr: DevicemgrService) {
    this.configProtocol = deviceMgr.configSession;
  }
  ngOnInit() {
    this.configProtocol.deviceTaskState$.subscribe((state) => {
      if (state == 'mmsi-edit') {
        this.shown = true;
        this.csvControl.setValue(
          this.configProtocol.config.getValue().mmsiDirectory!.toCsv()
        );
      } else {
        this.shown = false;
      }
    });
  }
  save() {
    if (this.csvControl.value) {
      this.configProtocol.config
        .getValue()
        .mmsiDirectory!.initFromCsv(this.csvControl.value);
    }
    this.configProtocol.writeMmsiDirectory();
  }
  cancel() {
    this.configProtocol.cancelMmsiDirectory();
  }
}
