import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthguardService } from './authguard.service';
import { FriendsListComponent } from './friends-list/friends-list.component';
import { FriendshipRequestsComponent } from './friendship-requests/friendship-requests.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { ManageUsersComponent } from './manage-users/manage-users.component';
import { MatchComponent } from './match/match.component';
import { MatchesListComponent } from './matches-list/matches-list.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { RegisterModeratorComponent } from './register-moderator/register-moderator.component';
import { ResetCredentialsComponent } from './reset-credentials/reset-credentials.component';
import { SearchFriendsComponent } from './search-friends/search-friends.component';
import { SignupComponent } from './signup/signup.component';
import { StatsComponent } from './stats/stats.component';

const routes: Routes = [
  { path: '',   redirectTo: 'login', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, canActivate:[AuthguardService]},
  { path: 'home/stats', component: StatsComponent, canActivate:[AuthguardService]},
  { path: 'home/friends', component: FriendsListComponent, canActivate:[AuthguardService]},
  { path: 'home/searchFriends', component: SearchFriendsComponent, canActivate:[AuthguardService]},
  { path: 'home/matchList', component: MatchesListComponent, canActivate:[AuthguardService]},
  { path: 'friendshipRequests', component: FriendshipRequestsComponent, canActivate:[AuthguardService]},
  { path: 'manageUsers', component: ManageUsersComponent, canActivate:[AuthguardService]},
  { path: 'match/:id', component: MatchComponent, canActivate:[AuthguardService]},
  { path: 'signup', component: SignupComponent },
  { path: 'login', component: LoginComponent },
  { path: 'reset', component: ResetCredentialsComponent, canActivate:[AuthguardService]},
  { path: 'registerModerator', component: RegisterModeratorComponent, canActivate:[AuthguardService]},
  { path: '**', component: PageNotFoundComponent} // Has to be the last routes path
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [AuthguardService]
})
export class AppRoutingModule { }
