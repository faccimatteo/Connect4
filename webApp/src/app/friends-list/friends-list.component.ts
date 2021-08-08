import { DataSource } from '@angular/cdk/collections';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { ClientHttpService } from '../client-http.service';


interface stats {
  win:number,
  loss:number,
  draw:number
}

interface User {
  username: string
  stats: stats
}

@Component({
  selector: 'app-friends-list',
  templateUrl: './friends-list.component.html',
  styleUrls: ['./friends-list.component.css']
})
export class FriendsListComponent{

  dataSource:FriendsDataSource;
  displayedColumns = ['username','win','loss','draw'];


  constructor(private clientHttp: ClientHttpService) {
    this.dataSource = new FriendsDataSource(this.clientHttp)
  }

  ngOnInit() {}

}


class FriendsDataSource extends DataSource<User> {

    constructor(private http: ClientHttpService) {
      super();
    }

    connect(): Observable<User[]> {
      return this.http.get_friends_with_stats();
    }

    disconnect() {}
}



