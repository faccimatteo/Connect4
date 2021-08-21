import { Component, OnInit } from '@angular/core';
import { ClientHttpService } from '../client-http.service';
import { RoutingService } from '../routing.service';
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
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(private clientHttp:ClientHttpService, private router:RoutingService) {
  }

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
