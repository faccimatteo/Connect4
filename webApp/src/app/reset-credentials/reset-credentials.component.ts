import { Component, OnInit } from '@angular/core';
import { Validators, FormBuilder } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ClientHttpService } from '../client-http.service';

@Component({
  selector: 'app-reset-credentials',
  templateUrl: './reset-credentials.component.html',
  styleUrls: ['../signup/signup.component.css']
})
export class ResetCredentialsComponent implements OnInit {

  public requestSucceded = false;
  public differentPassword = false;
  public error_message = '';
  public hide_password = true;
  public hide_confirm_password = true;
  public profilepic = '';

  addressForm = this.fb.group({
    username: [null, Validators.required],
    name: [null, Validators.required],
    surname: [null, Validators.required],
    password: [null, Validators.required],
    confirm_password: [null, Validators.required],
    profilepic: [null, Validators.required],
  });

  constructor(private fb: FormBuilder, public http:ClientHttpService, private router:Router, private sanitizer: DomSanitizer) {}

  ngOnInit() {
  }

  // Cannot be called before handleUpload
  set_user_credentials(name:string, surname:string, password:string, confirm_password:string){

    // Sanitizing data
    var name_sanitized = this.sanitizer.sanitize(1,name)
    var surname_sanitized = this.sanitizer.sanitize(1,surname)
    var password_sanitized = this.sanitizer.sanitize(1,password)
    var confirm_password_sanitized = this.sanitizer.sanitize(1,confirm_password)

    this.differentPassword = false;
    if(password_sanitized != confirm_password_sanitized)
      this.differentPassword = true;
    else{

      if(this.profilepic == '')
        this.error_message = 'Immagine di profilo obbligatoria'
      else{
        this.http.update_user(name_sanitized, surname_sanitized, password_sanitized, this.profilepic).subscribe(()=>{
          // Setting of first access to false
          this.http.on_first_login().subscribe(()=>{
            this.router.navigate(['/home']);
          });
        })
      }
    }
  }

  handleUpload(event) {

    if(event.target.files.length == 1){
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.profilepic = reader.result as string;
      };
      this.error_message = ''
    }
    else if(event.target.files.length == 0){
      this.profilepic = ''
      this.differentPassword = false;
      this.error_message = 'Immagine di profilo obbligatoria'
    }
  }

}
