import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShareComponent } from '../../../../src/app/share/share.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ShareComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'share';
}
