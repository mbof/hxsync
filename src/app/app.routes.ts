import { Routes } from '@angular/router';
import { ShareComponent } from './share/share.component';
import { DeviceComponent } from './device/device.component';

export const routes: Routes = [
  { path: '', component: DeviceComponent, pathMatch: 'full' },
  { path: 'share', component: ShareComponent }
];
