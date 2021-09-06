import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientHttpService } from '../client-http.service';
import { RoutingService } from '../routing.service';

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

  constructor(private fb: FormBuilder, private http:ClientHttpService, private router:Router) {}

  ngOnInit() {
  }

  // Cannot be called before handleUpload
  set_user(username:string, name:string, surname:string, password:string, confirm_password:string){
    this.differentPassword = false;
    if(password != confirm_password)
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
            this.http.register_user(username, name, surname, password, this.profilepic).subscribe(()=>{
              this.http.on_first_login().subscribe(() => {
                this.router.navigate(['/home']);
              })
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
