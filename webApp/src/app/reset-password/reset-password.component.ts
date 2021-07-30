import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  public differentPassword = false;
  public error_message = undefined

  addressForm = this.fb.group({
    password: [null, Validators.required],
    confirm_password: [null, Validators.required],
  });

  constructor(private fb: FormBuilder, private router:Router) {}

  ngOnInit() {
  }

  reset_password(password:string, confirm_password:string){
    if(password != confirm_password)
      this.differentPassword = true;
    else{
      // Compute reset password
      // set firstAccess in jwt to false
    }
  }
}
