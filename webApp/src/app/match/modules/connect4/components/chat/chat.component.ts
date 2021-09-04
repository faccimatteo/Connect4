import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import Pusher from 'pusher-js';
import { ClientHttpService } from '../../../../../client-http.service';
import { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import { MessagesService } from '../../../../../messages.service';
import { ViewChild } from '@angular/core';
import { MatchesService } from 'src/app/matches.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Connect4Service } from '../../connect4.service';
import { Router } from '@angular/router';

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
  private snackBarRef;
  public chat_channels:string[] = ['Globale'];
  public selected = 'Globale';
  private channel;

  constructor(private messagesService:MessagesService, private _snackBar: MatSnackBar, private clientHttp:ClientHttpService, private matches:MatchesService, private connect4Service:Connect4Service, private router:Router) {
    this.username = this.clientHttp.get_username()
    // Using Pusher for real time chat
    this.pusher = new Pusher('2eb653c8780c9ebbe91e', {
      cluster: 'eu'
    });
  }

  ngOnInit(): void {

    this.channel = this.pusher.subscribe('lookingForAMatch');
    // Subscribing at matchFound channel
    this.channel.bind('matchFound', data =>{
      if(data.challenged == this.clientHttp.get_username())
        // We stop looking for a match if the event is triggered so noone can find a game against us
        this.router.navigate(['match', data.matchId]);
      }
    );

    // When we are in global chat in the homepage
    if(this.id != "Globale"){
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
      this.messages = {'Globale':[]}

      if(!this.clientHttp.is_moderator()){
        this.clientHttp.get_friends_with_stats().subscribe((response)=>{


          // We subscribe to a global channel
          var channel = this.pusher.subscribe('chat' + this.id);
          channel.bind('message', data =>{
            this.messages['Globale'].push(data);
            this.viewPort.scrollToIndex((this.messages['Globale'].length));
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

            // We are listening if a user have accepted our friend request
            channel.bind('friendChannel', data =>{
              if(data.message == 'accepted'){
                // We update the chat component
                this.ngOnInit();
              }
              else if(data.message == 'invite'){
                console.log("invito ricevuto")
                this.snackBarRef = this._snackBar.open(data.username + ' ti ha invitato ad un match', 'Accetta', {
                  duration: 5000
                });

                this.snackBarRef.onAction().subscribe(() => {
                  this.matches.createMatch(data.username, true).subscribe((matchresponse) => {
                    this.channel.unsubscribe();
                      this.matches.informingMatchFound(data.username, matchresponse.id).subscribe(() => {
                        this.router.navigate(['match', matchresponse.id])
                      })
                  })
                });
              }
            })
          })
        })
      }else{
        this.clientHttp.get_users_with_stats().subscribe((response)=>{
          // We subscribe to a global channel
          var channel = this.pusher.subscribe('chat' + this.id);
          channel.bind('message', data =>{
            this.messages['Globale'].push(data);
            this.viewPort.scrollToIndex((this.messages['Globale'].length));
          });

          (response.result).forEach(element => {
            this.chat_channels.push(element.username)
            this.messages[element.username] = []

            // As channel we use user-friend id
            var channel = this.pusher.subscribe('chat' + this.clientHttp.get_username() + element.username);

            // Event binding for messages
            channel.bind('message', data =>{
              this.messages[data.to].push(data);
              this.viewPort.scrollToIndex((this.messages[data.to].length));
            })
          })
        })
      }

    }
  }

  submit():void{
    if(this.id != 'Globale'){
      // We have a unique id where we send a message
      this.messagesService.send_message(this.message, this.id, this.postfix,'')
      .subscribe(
        ()=>{
          this.message = '';
        })
    }else{
      if(this.selected == 'Globale'){
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

  // We challenge the selected friend
  challenge(){
    this.messagesService.friend_requests('invite', this.selected + this.clientHttp.get_username(), '', this.clientHttp.get_username()).subscribe(() => {
      this.connect4Service.cannotSearchMatch = true;

      this.snackBarRef = this._snackBar.open('Invito inviato', undefined, {duration:5000});



      // We lock the match search if we invited a friend
      this.snackBarRef.afterDismissed().subscribe(() => {
        this.connect4Service.cannotSearchMatch = false;
      });

    })
  }

}
