import { Component, Input, OnInit } from '@angular/core';
import Pusher from 'pusher-js';
import { ClientHttpService } from '../../../../../client-http.service';
import { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import { MessagesService } from '../../../../../messages.service';
import { ViewChild } from '@angular/core';
import { MatchesService } from 'src/app/matches.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  @Input()
  id: string = '';

  @ViewChild(CdkVirtualScrollViewport) viewPort: CdkVirtualScrollViewport;
  username = '';
  messages = [];
  message = '';
  private pusher;
  private postfix;

  constructor(private messagesService:MessagesService, private clientHttp:ClientHttpService, private matches:MatchesService) {
    this.username = this.clientHttp.get_username()
    // Using Pusher for real time chat
    this.pusher = new Pusher('2eb653c8780c9ebbe91e', {
      cluster: 'eu'
    });
  }

  ngOnInit(): void {
    // When we are in global chat in the homepage
    if(this.id != 'global'){
      // Checking if the palayer is one of the two players or not
      this.matches.getPlayers(this.id).subscribe((result) => {
        this.postfix = result.players.indexOf(this.clientHttp.get_username()) == -1 ? 'observers' : 'players'
        // Subscribing at chat channel
        var channel = this.pusher.subscribe('chat' + this.id + this.postfix);
        channel.bind('message', data =>{
            this.messages.push(data);
            this.viewPort.scrollToIndex((this.messages.length));
          }
        );
      })
    }
    else{
      this.postfix = '';
      // Subscribing at chat channel
      var channel = this.pusher.subscribe('chat' + this.id + '');
      channel.bind('message', data =>{
          this.messages.push(data);
          this.viewPort.scrollToIndex((this.messages.length));
        }
      );
    }


  }

  submit():void{
    this.messagesService.send_message_to_global(this.message, this.id, this.postfix)
    .subscribe(
      ()=>{
        this.message = '';
      })

  }

}
