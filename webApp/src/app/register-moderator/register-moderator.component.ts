import { Component, OnInit } from '@angular/core';
import { Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientHttpService } from '../client-http.service';

@Component({
  selector: 'app-register-moderator',
  templateUrl: './register-moderator.component.html',
  styleUrls: ['../signup/signup.component.css']
})
export class RegisterModeratorComponent implements OnInit {

  public requestSucceded = false;
  public pageTitle = 'Register a moderator';
  public hide_password = true;
  public errormessage = '';
  public duplicateUser = false;

  addressForm = this.fb.group({
    username: [null, Validators.required],
    password: [null, Validators.required],
  });

  constructor(private fb: FormBuilder, public http:ClientHttpService, private router:Router) {}

  ngOnInit() {
  }

  // Cannot be called before handleUpload
  set_user_credentials(username:string, password:string){

    this.http.find_user(username).subscribe(
      () => {
        this.duplicateUser = true;
      },
      (error) => {
        console.log(error)
        // If the user is not present inside the db
        if(error.error.statusCode == 500){
          this.http.register_moderator(username, password).subscribe(()=>{
            // If it was setted before
            this.duplicateUser = false;
            this.requestSucceded = true;
          })
        }
      }
    )
  }

}
