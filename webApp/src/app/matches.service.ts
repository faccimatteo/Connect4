import { HttpClient, HttpHeaders } from '@angular/common/http';
import { StringMap } from '@angular/compiler/src/compiler_facade_interface';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ClientHttpService } from './client-http.service';
import { PlayerIndex } from './match/ngxs/state/connect4.state';

@Injectable({
  providedIn: 'root'
})
export class MatchesService {

  public url = 'https://localhost:8443';

  constructor(private http:HttpClient, private clientHttp:ClientHttpService) { }


  // Creating a match
  createMatch(username:string, privateMatch:boolean):Observable<any>{
    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.post(this.url + '/matches',{
      player1: this.clientHttp.get_username(),
      player2: username,
      private: privateMatch
    }, options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  // Inform the user that the match has been found
  informingMatchFound(challenged:string, matchId:string):Observable<any>{

    // Creating header for the get request
  const options = {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
      'Cache-Control': 'no-cache',
      'Content-Type':  'application/json',
    })
  };

    return this.http.post(this.url + '/matchFound',{
      username: this.clientHttp.get_username(),
      matchId: matchId,
      challenged: challenged
    }, options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => Observable.throw(error.error))
    );
  }

  getMatchById(id:string):Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/matches/' + id, options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  getTurn(id:string):Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/matches/' + id + '/turn', options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  getPlayers(id:string):Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/matches/' + id + '/players', options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  makeMove(columnIndex:number, matchId:string){

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.post(this.url + '/doMove', {
      columnIndex: columnIndex,
      matchId: matchId
    }, options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  setMatchDrawn(matchId:string){

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/matches/' + matchId + '/setDraw', options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  setMatchLoss(matchId:string){

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/matches/' + matchId + '/setLoser', options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  communicateLoss(matchId:string){

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.post(this.url + '/communicateLoss', {
      matchId:matchId
    }, options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  requestState(matchId:string){

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.post(this.url + '/requestState', {
      matchId:matchId
    }, options).pipe(
      tap(() => {
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  sendState(matchId:string, currentBoard: (PlayerIndex | null)[]){

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.post(this.url + '/sendState', {
      matchId:matchId,
      currentBoard:currentBoard
    }, options).pipe(
      tap(() => {
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

  showMatches(){

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/activeMatches', options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error))
    );
  }

}
