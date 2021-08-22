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
  username = '';
  messages = [];
  message = '';
  private pusher;

  constructor(private messagesService:MessagesService, private clientHttp:ClientHttpService) {
    this.username = clientHttp.get_username()
    // Using Pusher for real time chat
    this.pusher = new Pusher('2eb653c8780c9ebbe91e', {
      cluster: 'eu'
    });
   }

  ngOnInit(): void {

    // Subscribing at chat channel
    var channel = this.pusher.subscribe('chatglobal');
    channel.bind('message', data =>{
        this.messages.push(data);
        this.viewPort.scrollToIndex((this.messages.length));
      }
    );
  }

  submit():void{

    this.messagesService.send_message_to_global(this.message)
    .subscribe(
      ()=>{
        this.message = '';
      })

  }

}
