import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ClientHttpService } from '../client-http.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {

  public duplicateUser = false;
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

  constructor(private fb: FormBuilder, private http:ClientHttpService, private router:Router, private sanitizer: DomSanitizer) {}

  ngOnInit() {
  }

  // Cannot be called before handleUpload
  set_user(username:string, name:string, surname:string, password:string, confirm_password:string){

    // Sanitizing data
    var username_sanitized = this.sanitizer.sanitize(1,username)
    var name_sanitized = this.sanitizer.sanitize(1,name)
    var surname_sanitized = this.sanitizer.sanitize(1,surname)
    var password_sanitized = this.sanitizer.sanitize(1,password)
    var confirm_password_sanitized = this.sanitizer.sanitize(1,confirm_password)

    this.differentPassword = false;
    if(password_sanitized != confirm_password_sanitized)
      this.differentPassword = true;
    else{
      this.http.find_user(username).subscribe(
        () => {
          this.duplicateUser = true;
        },() => {
          if(this.profilepic == '')
            this.error_message = 'Immagine di profilo obbligatoria'

          // If the user is not present inside the db
          else{
            this.http.register_user(username_sanitized, name_sanitized, surname_sanitized, password_sanitized, this.profilepic).subscribe(()=>{
              this.router.navigate(['/home']);
            })
          }
        }
      )
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
