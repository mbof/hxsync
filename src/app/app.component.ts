import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DeviceComponent } from './device/device.component';
import { version, buildDate, commitHash } from '../environments/version';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DeviceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'hxsync';
  version = version;
  buildDate = buildDate;
  commitHash = commitHash;
}
