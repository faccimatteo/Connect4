import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';
import { ClientHttpService } from '../client-http.service';


@Component({
  selector: 'app-search-friends',
  templateUrl: './search-friends.component.html',
  styleUrls: ['./search-friends.component.css']
})
export class SearchFriendsComponent implements OnInit {

  public users:any = []
  public error:string = ''

  addressForm = this.fb.group({
    username: [null, Validators.nullValidator],
  });

  constructor(private fb: FormBuilder, private clientHttp: ClientHttpService, private _snackBar: MatSnackBar, private sanitizer: DomSanitizer) {}

  ngOnInit():void{
  }

  searchPlayers(username:string){

    // Sanitizing data
    var username_sanitized = this.sanitizer.sanitize(1,username)

    // Resetting user array and error on every search
    this.users = []
    this.error = ''
    this.clientHttp.get_users().subscribe((response)=>{
      (response.users).forEach(element => {
        if ((element.username.toLowerCase()).includes(username_sanitized.toLowerCase()))
          this.users.push(element)
      });
      if (this.users.length == 0){
        this.error = "Nessun utente trovato!"
      }
    })

  }

  addPlayer(username:string){
    // Calling send_friendship_request function
    this.clientHttp.send_friendship_request(username).subscribe(()=>{
      this._snackBar.open('Richiesta a ' + username + ' inviata correttamente', '' , {duration: 3000});
    })
  }
}
