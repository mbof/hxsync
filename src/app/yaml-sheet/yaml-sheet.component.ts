import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfigSession } from '../config-session';
import { DevicemgrService } from '../devicemgr.service';
import { NodeBase } from 'yaml/dist/nodes/Node';
import { debounceTime } from 'rxjs/operators';
import { YamlDiagnostics } from '../config-modules/config-module-interface';

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
  yamlError:
    | { msg: string; range?: Array<number>; validation: boolean }
    | undefined;
  yamlDiagnostics: YamlDiagnostics = {};
  clipboardConfirmation: any;
  @ViewChild('yamlText') _yamlText: ElementRef | undefined;
  constructor(deviceMgr: DevicemgrService) {
    this.configSession = deviceMgr.configSession;
  }
  ngOnInit() {
    this.configSession.deviceTaskState$.subscribe((state) => {
      if (state == 'yaml-edit') {
        this.yamlControl.setValue(this.configSession.yamlText.getValue());
        this.shown = true;
      } else {
        this.shown = false;
      }
    });
    this.yamlControl.valueChanges
      .pipe(debounceTime(1000))
      .subscribe((value) => {
        if (value) {
          this.configSession.validateYaml(value);
        }
      });
    this.configSession.yamlError$.subscribe((error) => {
      this.yamlError = error;
    });
    this.configSession.yamlDiagnostics$.subscribe((diagnostics) => {
      this.yamlDiagnostics = diagnostics;
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
  async share() {
    if (!this.yamlControl.value) {
      return;
    }
    const sharedUrl =
      window.location.href.split('#')[0] +
      '../hx-share#' +
      encodeURIComponent(this.yamlControl.value);
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([sharedUrl], { type: 'text/plain' }),
        'text/html': new Blob([`<a href="${sharedUrl}">Configuration</a>`], {
          type: 'text/html'
        })
      })
    ]);
    this.clipboardConfirmation = 'Copied to clipboard!';
  }
  getLocationText(offset: number) {
    const lineAndCol = offsetToLineAndColumn(
      this.yamlControl.value || '',
      offset
    );
    if (lineAndCol) {
      return `line ${lineAndCol.line}, column ${lineAndCol.column}`;
    }
    return;
  }
  selectRange(range: Array<number>) {
    const lineAndCol = offsetToLineAndColumn(
      this.yamlControl.value || '',
      range[0]
    );
    const yamlText = this._yamlText?.nativeElement;
    yamlText.setSelectionRange(range[0], range[1]);
    yamlText.focus();
    if (lineAndCol) {
      yamlText.scrollTop =
        (lineAndCol.line - 1) *
        parseInt(
          getComputedStyle(yamlText).getPropertyValue('line-height'),
          10
        );
    }
  }
}

function offsetToLineAndColumn(data: string, offset: number) {
  var lines = data.split('\n');
  var total_length = 0;
  for (let i = 0; i < lines.length; i++) {
    if (total_length + lines[i].length + 1 >= offset) {
      return { line: i + 1, column: offset - total_length + 1 };
    }
    total_length += lines[i].length + 1;
  }
  return undefined;
}

export class YamlError extends Error {
  constructor(
    public msg: string,
    public node: NodeBase
  ) {
    super(msg);
  }
}
