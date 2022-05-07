import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { ClientHttpService } from './client-http.service';
import jwt_decode from "jwt-decode";
import { MatchComponent } from './match/match.component';
import { Connect4Service } from './match/modules/connect4/connect4.service';
import { Connect4State } from './match/ngxs/state/connect4.state';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'Connect4';

  constructor(public clientHttp:ClientHttpService, public connect4service: Connect4Service){}

  ngOnInit(){
    this.connect4service.canLeaveTheGame = false;
  }

  // We listen for broswer close
  @HostListener('window:beforeunload', [ '$event' ])
  beforeUnloadHandler(event) {
    // When we don't set 'remember'
    if(this.clientHttp.remember == false)
      this.clientHttp.logout()
  }
}
