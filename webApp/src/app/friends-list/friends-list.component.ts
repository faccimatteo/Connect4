import { Component, OnInit } from '@angular/core';
import { ClientHttpService } from '../client-http.service';

interface User {
  username: string
}

@Component({
  selector: 'app-friends-list',
  templateUrl: './friends-list.component.html',
  styleUrls: ['./friends-list.component.css']
})
export class FriendsListComponent implements OnInit {

  displayedColumns = ['username'];
  public dataSource:User[] = [];
  constructor(private clientHttp: ClientHttpService) {}

  ngOnInit() {
     //Code snippet without using StatsDataSource
      this.clientHttp.get_friends().subscribe(
      (user_list:string[]) =>
      {
        user_list.forEach((user)=>{
          this.dataSource.push({username:user});
        })

      })
      console.log(this.dataSource)
  }

}

/*export class StatsDataSource extends DataSource<stats> {
  constructor(private http: ClientHttpService) {
    super();
  }
  connect(): Observable<stats[]> {
    return this.http.load_stats();
  }
  disconnect() {}
}*/

