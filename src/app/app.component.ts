import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { version, buildDate, commitHash } from '../environments/version';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'hxsync';
  version = version;
  buildDate = buildDate;
  commitHash = commitHash;
}
