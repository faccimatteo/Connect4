import { HttpHeaders } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ClientHttpService } from './client-http.service';

@Injectable({
  providedIn: 'root'
})
export class MessagesService {

  // Adding the JWT inside the get request
  private options = {
    headers: new HttpHeaders({
      'Authorization': 'Bearer ' + localStorage.getItem('connect4_token'),
      'Cache-Control': 'no-cache',
      'Content-Type':  'application/json',
    })
  };

  constructor(private http:HttpClient, private clientHttp:ClientHttpService) { }

  send_message(message:string, id:string, type:string, receiver:string):Observable<any>{

    return this.http.post(this.clientHttp.url + '/messages',{
      message: message,
      id: id,
      type: type,
      receiver: receiver
    }, this.options)
  }
}
