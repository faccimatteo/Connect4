import { Component } from '@angular/core';
import { ClientHttpService } from './client-http.service';
import jwt_decode from "jwt-decode";

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

  constructor(public clientHttp:ClientHttpService){}

  ngOnInit(){
    if (localStorage.getItem('connect4_token') != null && localStorage.getItem('connect4_token') != ""){
      const exptime = (jwt_decode(this.clientHttp.get_token()) as TokenData).exp

      if (Number(String(Date.now()).substr(0,9)) - exptime > 0)
        localStorage.setItem('connect4_token','')
    }
  }

  is_allowed(){
    return localStorage.getItem('connect4_token') != null && localStorage.getItem('connect4_token') != ""
  }
}
