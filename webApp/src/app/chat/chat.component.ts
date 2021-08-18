import { Component, OnInit } from '@angular/core';
import Pusher from 'pusher-js';
import { ClientHttpService } from '../client-http.service';
import { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import { MessagesService } from '../messages.service';
import { ViewChild } from '@angular/core';


@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  @ViewChild(CdkVirtualScrollViewport) viewPort: CdkVirtualScrollViewport;
  username = ''
  messages = [];
  message = '';

  constructor(private messagesService:MessagesService, private clientHttp:ClientHttpService) {
    this.username = clientHttp.get_username()
   }

  ngOnInit(): void {

    // Using Pusher for real time chat
    var pusher = new Pusher('2eb653c8780c9ebbe91e', {
      cluster: 'eu'
    });

    var channel = pusher.subscribe('chat');
    channel.bind('message', data =>
      {this.messages.push(data);
        this.viewPort.scrollToIndex((this.messages.length), 'smooth');

      }
    );
  }

  submit():void{

    this.messagesService.send_message(this.username, this.message)
    .subscribe(
      ()=>{
        this.message = '';
      })

  }

}
