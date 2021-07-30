import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor() {
  }

  ngOnInit(): void {
  }

  // Function to detect if a user is remembered
  is_remembered_user():boolean {
    return localStorage.getItem('connect4_token') != null ? true : false
  }

}
