import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ClientHttpService } from './client-http.service';

@Injectable({
  providedIn: 'root'
})
export class ModeratorguardService {

  constructor(private router:Router, private clientHttp:ClientHttpService) { }

  canActivate(): boolean{
    if (!this.clientHttp.is_moderator())
      this.router.navigate(['login']);
    return this.clientHttp.is_moderator();
  }
}
