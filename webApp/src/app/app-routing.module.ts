import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatComponent } from './chat/chat.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { StatsComponent } from './stats/stats.component';

const routes: Routes = [
  { path: '',   redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'home/stats', component: StatsComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'resetPassword', component: ResetPasswordComponent },
  { path: 'login', component: LoginComponent },
  { path: '**', component: PageNotFoundComponent} // Has to be the last routes path
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
