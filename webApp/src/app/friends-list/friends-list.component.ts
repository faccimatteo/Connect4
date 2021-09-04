import { DataSource } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ClientHttpService } from '../client-http.service';


interface stats {
  win:number,
  loss:number,
  draw:number,
  matchplayed: number
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
  displayedColumns = ['username','win','loss','draw', 'matchplayed'];


  constructor(private clientHttp: ClientHttpService) {
  }

  ngOnInit() {
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
                matchplayed : element.stats.win + element.stats.loss + element.stats.draw,
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
                matchplayed : element.stats.win + element.stats.loss + element.stats.draw,
              }
            })
          });
          this.dataSource = temp_array
      })
    }
  }
}
