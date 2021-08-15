import { Component } from '@angular/core';
import { ClientHttpService } from './client-http.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'Connect4';

  constructor(public clientHttp:ClientHttpService){}
}
