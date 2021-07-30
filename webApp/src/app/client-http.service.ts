import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { tap, catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import jwt_decode from "jwt-decode";
import { ParticipantResponse } from 'ng-chat';

interface TokenData {
  id:string,
  username:string,
  moderator:boolean,
  firstAccess:boolean
}

interface stats {
  win:number,
  loss:number,
  draw:number
}

@Injectable({
  providedIn: 'root'
})
export class ClientHttpService {

  private stats = '';
  private token = '';
  public url = 'http://localhost:8080';


  //Inside the constructor we instantiate the token if present
  constructor(private http:HttpClient) {
    console.log('Client HTTP service is up')

    // We load our token from localStorage
    const myToken = localStorage.getItem('connect4_token');
    if (myToken != null){
      this.token = myToken;
      console.log("JWT loaded from local storage.");
    }
    else {
      console.log("No token found in local storage");
      this.token = ''
    }

  }

  login( username: string, password: string, remember: boolean ): Observable<any> {

    console.log('Login: ' + username + ' ' + password );

    // Creating header for login request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Basic ' + btoa( username + ':' + password),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/x-www-form-urlencoded',
      })
    };

    return this.http.get( this.url + '/login',  options ).pipe(
      tap( (data:any) => {

        this.token = data.token;
        // Just in case we setted remember the token is setted
        if ( remember ) {
          localStorage.setItem('connect4_token', this.token );
        }
      }));
  }

  register( user: any ): Observable<any> {
    const options = {
      headers: new HttpHeaders({
        'cache-control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    // TODO: CONTROLLARE SE L'ENDPOINT PER L'AGGIUNTA DELL'UTENTE E' CORRETTO
    return this.http.post( this.url + '/users', user, options ).pipe(
      tap( (data) => {
        console.log(JSON.stringify(data) );
      })
    );

  }

  logout() {
    console.log('Logging out');
    this.token = '';
    localStorage.setItem('connect4_token', this.token);
  }

  load_stats(): Observable<any> {

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get( this.url + '/users/' + this.get_username() + '/stats',  options ).pipe(
      tap( (data:any) => {

        this.stats = JSON.stringify(data);
      })
    );
  }

  get_friends():Observable<ParticipantResponse[]> {

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get( this.url + '/users/' + this.get_username() + '/stats',  options ).pipe(
        map((res: any) => res),
        catchError((error: any) => Observable.throw(error.error || 'Server error on requesting user\'s friend list'))
      )
  }


  get_id():string {
    return (jwt_decode(this.token) as TokenData).id;
  }

  get_username():string {
    return (jwt_decode(this.token) as TokenData).username;
  }

  is_moderator():boolean {
    return (jwt_decode(this.token) as TokenData).moderator;
  }

  is_first_access():boolean {
    return (jwt_decode(this.token) as TokenData).firstAccess;
  }

}

