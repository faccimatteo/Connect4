import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { tap, catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import jwt_decode from "jwt-decode";
import { Router } from '@angular/router';

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

interface User {
  username: string
  stats: stats
}

@Injectable({
  providedIn: 'root'
})
export class ClientHttpService {

  private stats;
  private token = '';
  public user = '';
  public url = 'http://localhost:8080';
  public friends = []

  //Inside the constructor we instantiate the token if present
  constructor(private http:HttpClient, private router:Router) {
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

    // Creating header for login request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Basic ' + btoa( username + ':' + password),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/x-www-form-urlencoded',
      })
    };

    return this.http.get( this.url + '/login',  options ).pipe(
      tap((data:any) => {

        this.token = data.token;
        // Just in case we setted remember the token is setted
        if(remember){
          localStorage.setItem('connect4_token', this.token );
        }
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting login'))
      );
  }

  register_user( username: string, name:string, surname:string, password:string, profilepic:string):Observable<any>{
    // Creating header for the post request
    const options = {
      headers: new HttpHeaders({
        'cache-control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    // Passing user as body field
    return this.http.post(this.url + '/users/addUser', {
      username:username,
      name:name,
      surname:surname,
      password:password,
      moderator:false,
      firstAccess:true,
      profilePic:profilepic

    }, options).pipe(
      tap((data) => {
        console.log("User added to database");
        console.log(JSON.stringify(data));
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting register_user'))
    );

  }

  get_users():Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/users/searchForUsers', options).pipe(
      tap(users => {
        users
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting get_users'))
    );
  }

  isLookingForAMatch():Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/users/getLookingForAMatch', options).pipe(
      tap(() => {

      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting isLookingForAMatch'))
    );
  }

  setLookingForAMatch(value:boolean):Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/users/setLookingForAMatch/' + value, options).pipe(
      tap(()=> {

      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting setLookingForAMatch'))
    );
  }

  pairForAMatch():Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    // Return if there's a user looking for a match
    return this.http.get(this.url + '/users/pairUserForAMatch', options).pipe(
      tap((response) => {
        response
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting pairForAMatch'))
    );
  }

  delete_friends(username:string):Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.delete(this.url + '/users/' + username, options).pipe(
      tap(() => {

      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting delete_friends'))
    );
  }

  get_friendship_requests():Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/users/' + this.get_username() + '/friendsRequests', options).pipe(
      tap((result) => {
        result
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting get_friendship_requests'))
    );
  }

  send_friendship_request(username:string):Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/users/sendFriendship/' + username, options).pipe(
      tap(() => {
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting send_friendship_request'))
    );
  }

  accept_user(username:string):Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/users/acceptFriendship/' + username, options).pipe(
      tap(() => {
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting accept_user'))
    );
  }

  reject_user(username:string):Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/users/rejectFriendship/' + username, options).pipe(
      tap(() => {
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting reject_user'))
    );
  }

  find_user(username:string): Observable<any> {

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get(this.url + '/users/' + username, options).pipe(
      tap(() => {
      }),
      catchError((error: any) => throwError(error.error || 'Server error on finding user' + username))
    );
  }

  logout() {
    console.log('Logging out');
    this.token = '';
    localStorage.setItem('connect4_token', this.token);
    this.router.navigate(['/login']);
  }

  load_stats(username:string): Observable<any> {

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + this.token,
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get( this.url + '/users/' + username + '/stats',  options ).pipe(
      tap((data:any) => {
        this.stats =
        {
          win:data.stats.win,
          loss:data.stats.loss,
          draw:data.stats.draw};
      }),
      catchError((error: any) => throwError(error.error || 'Server error on loading stats'))
    );
  }

  // On first acces of a moderator user he has to update his credentials
  update_user(name:string, surname:string, password:string, profilePic:string){
    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.post(this.url + '/users/setModerator/' + this.get_username(),
    {
      name:name,
      surname:surname,
      password:password,
      profilePic:profilePic
    }, options).pipe(
      tap(() => {
        console.log('Credentials of moderator ' + this.get_username() + ' has been changed successfully');
      }),
      catchError((error: any) => throwError(error.error || 'Server error on updating user'))
    );
  }

  register_moderator(username:string, password:string){

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.post(this.url + '/users/addModerator',
    {
      username:username,
      moderator:true,
      firstAccess:true,
      password:password
    },
    options).pipe(
      tap(() => {
        console.log('Moderator ' + username + ' has been registered successfully');
      }),
      catchError((error: any) => throwError(error.error || 'Server error on registering moderator'))
    );
  }


  get_friends():Observable<any> {

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    // Return an array of friends associated at the user
    return this.http.get(this.url + '/users/' + this.get_username() + '/friends', options).pipe(
      tap((friends: any) => friends),
      catchError((error: any) => throwError(error.error || 'Server error on requesting user\'s friends list'))
    )
  }

  get_users_with_stats():Observable<any> {

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get( this.url + '/users/allUserWithStats',  options).pipe(
      map((res: any) => res),
      catchError((error: any) => throwError(error.error || 'Server error on requesting get_users_with_stats'))
    )
  }

  get_friends_with_stats():Observable<any> {

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get( this.url + '/users/friendsWithStats',  options).pipe(
      map((res: any) => res),
      catchError((error: any) => throwError(error.error || 'Server error on requesting get_friends_with_stats'))
    )
  }

  get_profile_pic(username:string):Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get( this.url + '/users/' + username + '/profilepic',  options).pipe(
      map((res: any) => res),
      catchError((error: any) => throwError(error.error || 'Server error on requesting user\'s profile pic'))
    )
  }

  // Function to load on user's first access
  on_first_login():Observable<any>{

    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.get( this.url + '/users/' + this.get_username() + '/firstLogin',  options).pipe(
      tap((response:any) => {
        // Once I get the response with the token from the API call
        localStorage.setItem('connect4_token', response.token);
        console.log('Access to user ' + this.get_username() + " garanted.");
      }),
      catchError((error: any) => throwError(error.error || 'Server error on user\'s first access.'))
    )
  }


  delete_user(username:string):Observable<any>{
    // Creating header for the get request
    const options = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
        'Cache-Control': 'no-cache',
        'Content-Type':  'application/json',
      })
    };

    return this.http.delete( this.url + '/users/' + username,  options).pipe(
      tap(() => {
      }),
      catchError((error: any) => throwError(error.error || 'Server error on requesting delete_user.'))
    )
  }

  get_token():string{
    return this.token;
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

