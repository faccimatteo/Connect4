import { HttpClient, HttpHeaders } from '@angular/common/http';
import { StringMap } from '@angular/compiler/src/compiler_facade_interface';
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
  informingMatchFound(username:string, challenged:string, matchId:string):Observable<any>{
    return this.http.post(this.url + '/matchFound',{
      username: username,
      matchId: matchId,
      challenged
    }, this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => Observable.throw(error.error || 'Server error on requesting informingMatchFound'))
    );
  }

  getMatchById(id:string):Observable<any>{
    return this.http.get(this.url + '/matches/' + id, this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => Observable.throw(error.error || 'Server error on requesting getMatchById'))
    );
  }

  getBeginner(id:string):Observable<any>{
    return this.http.get(this.url + '/matches/' + id + '/beginner', this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => Observable.throw(error.error || 'Server error on requesting getBeginner'))
    );
  }

  getPlayers(id:string):Observable<any>{
    return this.http.get(this.url + '/matches/' + id + '/players', this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => Observable.throw(error.error || 'Server error on requesting getPlayers'))
    );
  }



}
