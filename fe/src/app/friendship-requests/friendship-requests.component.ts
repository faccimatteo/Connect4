import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientHttpService } from '../client-http.service';
import { MessagesService } from '../messages.service';

@Component({
  selector: 'app-friendship-requests',
  templateUrl: './friendship-requests.component.html',
  styleUrls: ['../search-friends/search-friends.component.css']
})
export class FriendshipRequestsComponent implements OnInit {

  public friendRequests:string[] = []
  public error = ''
  constructor(private clientHttp:ClientHttpService, private _snackBar:MatSnackBar, private messagesService:MessagesService) { }

  ngOnInit(): void {
    this.clientHttp.get_friendship_requests().subscribe((result)=>{
      this.friendRequests = result.friendsRequests
      if (this.friendRequests.length == 0)
        this.error = 'Nessuna richiesta di amicizia in sospeso'
    })

  }

  acceptPlayer(username:string):void{
    this.clientHttp.accept_user(username).subscribe(()=>{
      this._snackBar.open('Richiesta di ' + username + ' acettata', '' , {duration: 3000});
      // After we accepted we delete the user from the list
      delete this.friendRequests[this.friendRequests.indexOf(username)]

      // We inform the user that he's our friend now
      this.messagesService.friend_requests('accepted', 'friendshipRequests', '', username).subscribe(() => {
        // After the operation we reload the page
      })

      this.ngOnInit()
    })
  }

  rejectPlayer(username:string):void{
    this.clientHttp.reject_user(username).subscribe(()=>{
      this._snackBar.open('Richiesta di ' + username + ' rifiutata', '' , {duration: 3000});
      // After we accepted we delete the user from the list
      delete this.friendRequests[this.friendRequests.indexOf(username)]
      // After the operation we reload the page
      this.ngOnInit()
    })
  }
}
