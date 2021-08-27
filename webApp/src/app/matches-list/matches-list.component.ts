import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ClientHttpService } from '../client-http.service';
import { MatchesService } from '../matches.service';

@Component({
  selector: 'app-matches-list',
  templateUrl: './matches-list.component.html',
  styleUrls: ['./matches-list.component.scss']
})
export class MatchesListComponent implements OnInit {

  public matches:any = []
  public error:string = ''
  public propic1;
  public propic2;

  constructor(private router:Router,private matchesService:MatchesService, private clientHttp:ClientHttpService) {

  }

  ngOnInit(): void {
    this.matchesService.showMatches().subscribe((response) => {
      this.matches = response
    })
  }

  observeMatch(matchId:string){
    this.router.navigate(['match', matchId])
  }

}
