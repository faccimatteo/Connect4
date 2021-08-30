import { ChangeDetectorRef, Component } from '@angular/core';
import { ClientHttpService } from './client-http.service';
import jwt_decode from "jwt-decode";
import { MatchComponent } from './match/match.component';
import { Connect4Service } from './match/modules/connect4/connect4.service';

interface TokenData {
  id:string,
  username:string,
  moderator:boolean,
  firstAccess:boolean,
  iat: number,
  exp: number
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'Connect4';

  constructor(public clientHttp:ClientHttpService, public connect4service: Connect4Service, public matchComponent:MatchComponent){}

  ngOnInit(){
    if (localStorage.getItem('connect4_token') != null && localStorage.getItem('connect4_token') != ""){
      const exptime = (jwt_decode(this.clientHttp.get_token()) as TokenData).exp
      if (Number(String(Date.now()).substr(0,10)) - exptime > 0)
        localStorage.setItem('connect4_token','')
    }
  }

  is_allowed(){
    return localStorage.getItem('connect4_token') != null && localStorage.getItem('connect4_token') != ""
  }
}
