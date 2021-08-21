import { Component, OnInit } from '@angular/core';
import { ClientHttpService } from '../client-http.service';
import { RoutingService } from '../routing.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(private clientHttp:ClientHttpService, private router:RoutingService) {
  }

  ngOnInit(){
  }

  is_allowed(){
    return localStorage.getItem('connect4_token') != null && localStorage.getItem('connect4_token') != ""
  }


}
