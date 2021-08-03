import { Component, OnInit } from '@angular/core';
import { ClientHttpService } from '../client-http.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(private clientHttp:ClientHttpService) {
  }

  ngOnInit(): void {
  }

  // Function to detect if a user is remembered
  is_remembered_user():boolean {
    // TODO: da far capire come reindirizzare gli utenti registrati
    if(localStorage.getItem('connect4_token') != null || this.clientHttp.is_first_access()){
      this.clientHttp.not_first_access_anymore();
      return true;
    }else
      return false;
  }

}
