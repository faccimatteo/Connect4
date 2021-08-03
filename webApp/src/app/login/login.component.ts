import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientHttpService } from '../client-http.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  public error_message = undefined

  addressForm = this.fb.group({
    username: [null, Validators.required],
    password: [null, Validators.required],
    remember_me: null
  });

  constructor(private fb: FormBuilder, private userlogin:ClientHttpService, private router:Router) {}

  ngOnInit() {
  }

  // TODO: gestire gli errori in caso di login scorretto
  login(username:string, password:string, remember_me:boolean){
    this.userlogin.login( username, password, remember_me).subscribe( (d) => {
      console.log('Login granted: ' + JSON.stringify(d) );
      this.router.navigate(['/home']);
    }, (err) => {
      console.log('Login error: ' + JSON.stringify(err) );
    });
  }


}
