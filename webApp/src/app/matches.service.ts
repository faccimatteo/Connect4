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
      catchError((error: any) => throwError(error.error || 'Server error on requesting searchPlayers'))
    );
  }

  // Inform the user that the match has been found
  informingMatchFound(challenged:string, matchId:string):Observable<any>{
    return this.http.post(this.url + '/matchFound',{
      username: this.clientHttp.get_username(),
      matchId: matchId,
      challenged: challenged
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
      catchError((error: any) => throwError(error.error || 'Server error on requesting getMatchById'))
    );
  }

  getTurn(id:string):Observable<any>{
    return this.http.get(this.url + '/matches/' + id + '/turn', this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting getBeginner'))
    );
  }

  getPlayers(id:string):Observable<any>{
    return this.http.get(this.url + '/matches/' + id + '/players', this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting getPlayers'))
    );
  }

  makeMove(columnIndex:number, matchId:string){
    return this.http.post(this.url + '/doMove', {
      columnIndex: columnIndex,
      matchId: matchId
    }, this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting makeMove'))
    );
  }

  setMatchDrawn(matchId:string){
    return this.http.get(this.url + '/matches/' + matchId + '/setDraw', this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting setMatchDrawn'))
    );
  }

  setMatchLoss(matchId:string){
    return this.http.get(this.url + '/matches/' + matchId + '/setLoser', this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting setMatchLoss'))
    );
  }

  communicateLoss(matchId:string){
    return this.http.post(this.url + '/communicateLoss', {
      matchId:matchId
    }, this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting communicateLoss'))
    );
  }

  requestState(matchId:string){
    return this.http.post(this.url + '/requestState', {
      matchId:matchId
    }, this.logged).pipe(
      tap(() => {
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting requestState'))
    );
  }

  sendState(matchId:string, currentBoard: (PlayerIndex | null)[]){
    return this.http.post(this.url + '/sendState', {
      matchId:matchId,
      currentBoard:currentBoard
    }, this.logged).pipe(
      tap(() => {
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting sendState'))
    );
  }

  showMatches(){
    return this.http.get(this.url + '/activeMatches', this.logged).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting showMatches'))
    );
  }

}
