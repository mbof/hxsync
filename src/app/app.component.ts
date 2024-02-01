import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DeviceComponent } from './device/device.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DeviceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'nghx';
}
