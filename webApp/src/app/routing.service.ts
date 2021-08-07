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
    if(localStorage.getItem('connect4_token') == null)
      this.router.navigate(['/login']);
    // On first moderator access
    if(this.clientHttp.is_first_access() == true && this.clientHttp.is_moderator() == true)
      this.router.navigate(['/reset']);
    else{
      this.router.navigate(['/home'])
    }


  }
}
