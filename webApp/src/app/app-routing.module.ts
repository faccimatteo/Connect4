import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatComponent } from './chat/chat.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { RegisterModeratorComponent } from './register-moderator/register-moderator.component';
import { ResetCredentialsComponent } from './reset-credentials/reset-credentials.component';
import { SignupComponent } from './signup/signup.component';
import { StatsComponent } from './stats/stats.component';

const routes: Routes = [
  { path: '',   redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'home/stats', component: StatsComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'login', component: LoginComponent },
  { path: 'reset', component: ResetCredentialsComponent },
  { path: 'registerModerator', component: RegisterModeratorComponent },
  { path: '**', component: PageNotFoundComponent} // Has to be the last routes path
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
