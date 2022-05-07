import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ClientHttpService } from '../client-http.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  public error_message = '';
  public hide_password = true;

  addressForm = this.fb.group({
    username: [null, Validators.required],
    password: [null, Validators.required],
    remember_me: null
  });

  constructor(private fb: FormBuilder, private clientHttp:ClientHttpService, private router:Router, private sanitizer: DomSanitizer) {}

  ngOnInit() {
  }

  login(username:string, password:string, remember_me:boolean){
    // Sanitizing data
    var username_sanitized = this.sanitizer.sanitize(1,username)
    var password_sanitized = this.sanitizer.sanitize(1,password)
    this.clientHttp.login(username_sanitized, password_sanitized, remember_me).subscribe(() => {
      // At this point the user has already done the first access so we don't need to care about setting the token
      if(this.clientHttp.is_first_access() && this.clientHttp.is_moderator())
        this.router.navigate(['/reset']);
      else{
        this.router.navigate(['/home'])
      }
    }, () => {
      this.error_message = 'Login failed. Check your credentials or try again later';
    });
  }


}
