import { Component, OnInit } from '@angular/core';
import { ClientHttpService } from '../client-http.service';

interface stats {
  win:number,
  loss:number,
  draw:number,
  matchplayed:number,
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.css']
})
export class StatsComponent implements OnInit {

  displayedColumns = ['win', 'loss', 'draw', 'matchplayed'];
  dataSource:stats[]= [];
  constructor(private clientHttp: ClientHttpService) {

      // Loads stats for the current signed user
      //this.dataSource = new StatsDataSource(this.clientHttp);

  }

  ngOnInit() {
     //Code snippet without using StatsDataSource
      this.clientHttp.load_stats(this.clientHttp.get_username()).subscribe(
      (result) =>
      {
        const element:stats[] = [{
          win: result.stats.win,
          loss: result.stats.loss,
          draw: result.stats.draw,
          matchplayed: result.stats.win + result.stats.loss + result.stats.draw,
        }]
        this.dataSource = element;
      })
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
