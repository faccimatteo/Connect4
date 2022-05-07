import { Component, OnChanges, OnInit } from '@angular/core';
import { ClientHttpService } from '../client-http.service';
import jwt_decode from "jwt-decode";
import { AppComponent } from '../app.component';

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

  public picProfile:string = '';

  constructor(public clientHttp:ClientHttpService, public app: AppComponent) {
  }

  ngOnInit(){
    this.clientHttp.get_profile_pic(this.clientHttp.get_username()).subscribe((response) => {
      this.picProfile = response.profilepic
    })
  }
}
