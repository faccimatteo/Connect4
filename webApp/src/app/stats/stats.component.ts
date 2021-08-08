import { Component, OnInit } from '@angular/core';
import { ClientHttpService } from '../client-http.service';

interface stats {
  win:number,
  loss:number,
  draw:number
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.css']
})
export class StatsComponent implements OnInit {

  displayedColumns = ['win', 'loss', 'draw'];
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
          win:(result as stats).win,
          loss:(result as stats).loss,
          draw:(result as stats).draw
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
