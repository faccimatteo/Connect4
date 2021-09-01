import { Component, OnInit } from '@angular/core';
import { ClientHttpService } from '../client-http.service';
import { RoutingService } from '../routing.service';
import jwt_decode from "jwt-decode";
import { AppComponent } from '../app.component';
import { MatchComponent } from '../match/match.component';
import { ChangeDetectorRef } from '@angular/core';

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

  public picProfile:string;

  constructor(public clientHttp:ClientHttpService, private router:RoutingService, public app: AppComponent, private match: MatchComponent) {
  }

  ngOnInit(){
    this.match.isEnded = true;

    // Checking for JWT
    if(this.app.is_allowed()){
      this.clientHttp.get_profile_pic(this.clientHttp.get_username()).subscribe((response) => {
        this.picProfile = response.profilepic
      })
    }

  }
}
