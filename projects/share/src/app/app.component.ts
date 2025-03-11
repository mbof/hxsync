import { Component } from '@angular/core';
import { ShareComponent } from '../../../../src/app/share/share.component';

@Component({
    selector: 'app-root',
    imports: [ShareComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'share';
}
