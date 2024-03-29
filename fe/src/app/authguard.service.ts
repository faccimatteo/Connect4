import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
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

@Injectable({
  providedIn: 'root'
})
export class AuthguardService implements CanActivate{

  constructor(private router:Router, private clientHttp:ClientHttpService) { }

  canActivate(): boolean{
    if(localStorage.getItem('connect4_token') != null && localStorage.getItem('connect4_token') != ''){
      const exptime = (jwt_decode(this.clientHttp.get_token()) as TokenData).exp
      if (Number(String(Date.now()).substr(0,10)) - exptime > 0){
        localStorage.setItem('connect4_token','')
        return false
      }
      return true;
    }else{
      this.router.navigate(['login']);
      return false;
    }
  }
}
