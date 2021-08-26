import { Component, OnInit } from '@angular/core';
import { ClientHttpService } from '../client-http.service';
import { RoutingService } from '../routing.service';
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

  constructor(private clientHttp:ClientHttpService, private router:RoutingService, public app: AppComponent) {
  }

  ngOnInit(){
    // Checking for JWT
    this.app.ngOnInit()
  }
}
