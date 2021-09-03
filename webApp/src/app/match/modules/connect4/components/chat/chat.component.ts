import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
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
export class ChatComponent implements OnInit{

  @Input()
  id: string = '';

  @ViewChild(CdkVirtualScrollViewport) viewPort: CdkVirtualScrollViewport;
  username = '';
  public messages;
  message = '';
  private pusher;
  private postfix = '';
  public chat_channels:string[] = ['global']
  public selected = 'global'

  constructor(private messagesService:MessagesService, private clientHttp:ClientHttpService, private matches:MatchesService) {
    this.username = this.clientHttp.get_username()
    // Using Pusher for real time chat
    this.pusher = new Pusher('2eb653c8780c9ebbe91e', {
      cluster: 'eu'
    });
  }

  ngOnInit(): void {
    // When we are in global chat in the homepage
    if(this.id != "global"){
        this.messages = []
        // Checking if the palayer is one of the two players or not
        this.matches.getPlayers(this.id).subscribe((result) => {
          this.postfix = result.players.indexOf(this.clientHttp.get_username()) == -1 ? 'observers' : 'players'

          // Subscribing at chat channel
          var channel = this.pusher.subscribe('chat' + this.id + this.postfix);
          channel.bind('message', data =>{
              this.messages.push(data);
              this.viewPort.scrollToIndex((this.messages.length));
          })
        })

    }else{
      this.messages = {'global':[]}
      this.clientHttp.get_friends_with_stats().subscribe((response)=>{

        var channel = this.pusher.subscribe('chatfriendshipRequests');
        // We are listening if a user have accepted our friend request
        channel.bind('friendshipRequests', data =>{
          if (data.to == this.clientHttp.get_username())
            console.log("richiesta accettata")
            if(data.message == 'accepted')
              this.ngOnInit()
        })

        // We subscribe to a global channel
        var channel = this.pusher.subscribe('chat' + this.id);
        channel.bind('message', data =>{
          this.messages['global'].push(data);
          this.viewPort.scrollToIndex((this.messages['global'].length));
        });

        (response.result).forEach(element => {
          this.chat_channels.push(element.username)
          this.messages[element.username] = []

          // As channel we use user-friend id
          var channel = this.pusher.subscribe('chat' + this.clientHttp.get_username() + element.username);
          channel.bind('message', data =>{
            this.messages[data.to].push(data);
            this.viewPort.scrollToIndex((this.messages[data.to].length));
          })
        })
        //TODO: da fare
        // We are listening if a user have sent us a friend request
      })
    }

  }

  submit():void{
    if(this.id != 'global'){
      // We have a unique id where we send a message
      this.messagesService.send_message(this.message, this.id, this.postfix,'')
      .subscribe(
        ()=>{
          this.message = '';
        })
    }else{
      if(this.selected == 'global'){
        this.messagesService.send_message(this.message, this.id, this.postfix, this.selected)
        .subscribe(
          ()=>{
            this.message = '';
        })
      }else{
        this.messagesService.send_message(this.message, this.clientHttp.get_username() + this.selected, this.postfix, this.selected)
        .subscribe(
          ()=>{
            this.message = '';
        })

        // The other user will be listening on the channel below so we send a message even on this channel
        // we need to store the info in the correct field of the dictionary so we send the username as receiver
        this.messagesService.send_message(this.message, this.selected + this.clientHttp.get_username(), this.postfix, this.clientHttp.get_username())
        .subscribe(
          ()=>{
            this.message = '';
        })
      }
    }


  }

}
