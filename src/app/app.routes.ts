import { Routes } from '@angular/router';
import { ShareComponent } from './share/share.component';
import { DeviceComponent } from './device/device.component';

export const routes: Routes = [
  { path: '', component: DeviceComponent, pathMatch: 'full' },
  {
    matcher: (url) => {
      if (url.length > 0 && url[0].path.match(/^share/)) {
        return {
          consumed: url
        };
      }
      return null;
    },
    component: ShareComponent
  }
];
