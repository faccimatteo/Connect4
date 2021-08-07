import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ClientHttpService } from '../client-http.service';
import { RoutingService } from '../routing.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  public error_message = '';

  addressForm = this.fb.group({
    username: [null, Validators.required],
    password: [null, Validators.required],
    remember_me: null
  });

  constructor(private fb: FormBuilder, private clientHttp:ClientHttpService, private router:RoutingService) {}

  ngOnInit() {
  }

  login(username:string, password:string, remember_me:boolean){
    this.clientHttp.login(username, password, remember_me).subscribe(() => {
      this.router.routing();
    }, () => {
      this.error_message = 'Login failed. Check your credentials or try again later';
    });
  }


}
