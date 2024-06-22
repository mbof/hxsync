import { Routes } from '@angular/router';
import { DeviceComponent } from './device/device.component';

export const routes: Routes = [
  { path: '', component: DeviceComponent, pathMatch: 'full' }
];
