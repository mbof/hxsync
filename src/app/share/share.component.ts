import { HttpParams } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-share',
  standalone: true,
  imports: [],
  templateUrl: './share.component.html',
  styleUrl: './share.component.css'
})
export class ShareComponent {
  yaml: string = '';
  constructor(private route: ActivatedRoute) {}
  ngOnInit() {
    this.route.fragment.subscribe((f) => (this.yaml = f || ''));
  }
}
