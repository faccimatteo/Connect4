import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ClientHttpService } from '../client-http.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {

  public duplicateUser = false;
  public requestSucceded = false;
  public pageTitle = 'Register yourself';
  public differentPassword = false;
  public error_message = undefined;
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

  constructor(private fb: FormBuilder, private http:ClientHttpService, private router:Router) {}

  ngOnInit() {
  }

  // Cannot be called before handleUpload
  set_user(username:string, name:string, surname:string, password:string, confirm_password:string){
    if(password != confirm_password)
      this.differentPassword = true;
    else{
      this.http.find_user(username).subscribe(
        () => {
          this.duplicateUser = true;
        }
      ).add(()=>{
        // If the
        if(!this.duplicateUser)
          this.http.register_user(username, name, surname, password, this.profilepic).subscribe(()=>{
            this.requestSucceded = true;
            this.router.navigate(['/home']);
            // Snackbar di benvenuto
          })
      })
    }

  }

  handleUpload(event) {

    const file = event.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.profilepic = reader.result as string;
      console.log(this.profilepic)
    };
  }

}
