import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ClientHttpService } from './client-http.service';

@Injectable({
  providedIn: 'root'
})
export class RoutingService {

  constructor(private clientHttp:ClientHttpService, private router:Router) { }

  // We use 'routing' function to route the user landed in the homepage,
  // because we can't get access to local storage on 'ngOnInit'
  routing(){
    // If we have no token we redirect to login page
    if(localStorage.getItem('connect4_token') == null || localStorage.getItem('connect4_token') == '')
      this.router.navigate(['/login']);
    // On first moderator access
    else if(this.clientHttp.is_first_access() && this.clientHttp.is_moderator())
      this.router.navigate(['/reset']);
    else{
      this.router.navigate(['/home'])
    }
  }
}
