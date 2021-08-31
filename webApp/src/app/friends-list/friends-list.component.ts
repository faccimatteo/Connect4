import { DataSource } from '@angular/cdk/collections';
import { Component } from '@angular/core';
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
  styleUrls: ['../stats/stats.component.css']
})
export class FriendsListComponent{

  dataSource:User[] = [];
  displayedColumns = ['username','win','loss','draw'];


  constructor(private clientHttp: ClientHttpService) {
    //this.dataSource = new FriendsDataSource(this.clientHttp)
  }

  ngOnInit() {
    //Code snippet without using StatsDataSource
    if(!this.clientHttp.is_moderator()){
      this.clientHttp.get_friends_with_stats().subscribe(
        (response) =>
        {
          var temp_array:User[] = []
          response.result.forEach(element => {
            temp_array.push({
              username: element.username,
              stats:{
                win: element.stats.win,
                loss: element.stats.loss,
                draw: element.stats.draw,
              }
            })
          });
          this.dataSource = temp_array
      })
    }else{
      this.clientHttp.get_users_with_stats().subscribe(
        (response) =>
        {
          var temp_array:User[] = []
          response.result.forEach(element => {
            temp_array.push({
              username: element.username,
              stats:{
                win: element.stats.win,
                loss: element.stats.loss,
                draw: element.stats.draw,
              }
            })
          });
          this.dataSource = temp_array
      })
    }
  }
}

/*
class FriendsDataSource extends DataSource<User> {

    constructor(private http: ClientHttpService) {
      super();
    }

    connect(): Observable<User[]> {
      return this.http.get_friends_with_stats();
    }

    disconnect() {}
}*/



