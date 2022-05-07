import { Component, OnInit } from '@angular/core';
import { Validators, FormBuilder } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ClientHttpService } from '../client-http.service';

@Component({
  selector: 'app-register-moderator',
  templateUrl: './register-moderator.component.html',
  styleUrls: ['../signup/signup.component.css']
})
export class RegisterModeratorComponent implements OnInit {

  public requestSucceded = false;
  public hide_password = true;
  public errormessage = '';
  public duplicateUser = false;

  addressForm = this.fb.group({
    username: [null, Validators.required],
    password: [null, Validators.required],
  });

  constructor(private fb: FormBuilder, public http:ClientHttpService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
  }

  // Cannot be called before handleUpload
  set_user_credentials(username:string, password:string){
    // Sanitizing data
    var username_sanitized = this.sanitizer.sanitize(1,username)
    var password_sanitized = this.sanitizer.sanitize(1,password)
    // If it was setted before
    this.duplicateUser = false;
    this.requestSucceded = false;
    this.http.find_user(username).subscribe(
      () => {
        this.duplicateUser = true;
      },
      (error) => {
        // If the user is not present inside the db
        if(error.statusCode == 404){
          this.http.register_moderator(username_sanitized, password_sanitized).subscribe(()=>{
            this.requestSucceded = true;
          })
        }
      }
    )
  }

}
