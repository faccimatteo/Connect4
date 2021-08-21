import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ClientHttpService } from './client-http.service';
import * as io from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketioService {

  private socket;
  constructor(private clientHttp: ClientHttpService) { }

  connect():Observable<any>{
    this.socket = io(this.clientHttp.url);
    return new Observable();
  }

}
