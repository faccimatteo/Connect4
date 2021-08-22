import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ClientHttpService } from './client-http.service';

@Injectable({
  providedIn: 'root'
})
export class MatchesService {

  public url = 'http://localhost:8080';

  // Creating header for the get request
  private logged = {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
      'Cache-Control': 'no-cache',
      'Content-Type':  'application/json',
    })
  };

  constructor(private http:HttpClient, private clientHttp:ClientHttpService) { }


  // Creating a match
  createMatch(username:string):Observable<any>{
    return this.http.post(this.url + '/matches',{
      player1: this.clientHttp.get_username(),
      player2: username
    }, this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => Observable.throw(error.error || 'Server error on requesting searchPlayers'))
    );
  }

  // Inform the user that the match has been found
  informingMatchFound(username:string, matchId:string):Observable<any>{
    return this.http.post(this.url + '/matchFound',{
      username: username,
      matchId: matchId
    }, this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => Observable.throw(error.error || 'Server error on requesting searchPlayers'))
    );
  }




}
