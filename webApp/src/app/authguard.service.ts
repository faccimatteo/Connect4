import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthguardService implements CanActivate{

  constructor(private router:Router) { }

  canActivate(): boolean{
    if(localStorage.getItem('connect4_token') != null && localStorage.getItem('connect4_token') != ''){
      return true;
    }else{
      this.router.navigate(['login'])
      return false;
    }
  }
}
