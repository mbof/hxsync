import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfigSession } from '../config-session';
import { DevicemgrService } from '../devicemgr.service';

@Component({
  selector: 'yaml-sheet',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './yaml-sheet.component.html',
  styleUrl: './yaml-sheet.component.css'
})
export class YamlSheetComponent {
  shown = false;
  configSession: ConfigSession;
  yamlControl = new FormControl('Uninitialized');
  constructor(deviceMgr: DevicemgrService) {
    this.configSession = deviceMgr.configSession;
  }
  ngOnInit() {
    this.configSession.deviceTaskState$.subscribe((state) => {
      if (state == 'yaml-edit') {
        this.shown = true;
        this.yamlControl.setValue(
          this.configSession.yaml.getValue().toString({}).trim()
        );
      } else {
        this.shown = false;
      }
    });
  }
  save() {
    if (this.yamlControl.value) {
      // TODO: save
    }
  }
  cancel() {
    this.configSession.cancelYamlEdit();
  }

}
