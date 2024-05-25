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
  yamlError: string | undefined;
  constructor(deviceMgr: DevicemgrService) {
    this.configSession = deviceMgr.configSession;
  }
  ngOnInit() {
    this.configSession.deviceTaskState$.subscribe((state) => {
      if (state == 'yaml-edit') {
        this.yamlControl.setValue(
          this.configSession.yamlText.getValue()
        );
        this.shown = true;
      } else {
        this.shown = false;
      }
    });
    this.configSession.yamlError$.subscribe((error) => {
      this.yamlError = error;
    });
  }
  save() {
    if (this.yamlControl.value) {
      this.configSession.saveYaml(this.yamlControl.value);
    }
  }
  cancel() {
    this.configSession.cancelYamlEdit();
  }
}

function offsetToLineAndColumn(data: string, offset: number) {
  var lines = data.split('\n');
  var total_length = 0;
  for (let i = 0; i < lines.length; i++) {
      if (total_length + lines[i].length + 1 >= offset) {
          return { line: i + 1, column: offset - total_length + 1};
      }
      total_length += lines[i].length + 1
  }
  return undefined;
}
export class YamlError extends Error {
  constructor(public msg: string, public location: number) {
    super(msg);
  }
  toUserMessage(yamlText: string) {
    const lineAndCol = offsetToLineAndColumn(yamlText, this.location);
    if (!lineAndCol) {
      return `${this.msg} (at ${this.location})`;
    } else {
      return `${this.msg} (at line ${lineAndCol.line}, column ${lineAndCol.column})`;
    }
  }
}