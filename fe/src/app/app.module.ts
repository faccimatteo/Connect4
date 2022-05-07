import { LayoutModule } from "@angular/cdk/layout";
import { HttpClientModule } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { BubbleMenuComponent } from "./bubble-menu/bubble-menu.component";
import { ChatComponent } from "./match/modules/connect4/components/chat/chat.component";
import { FriendsListComponent } from "./friends-list/friends-list.component";
import { FriendshipRequestsComponent } from "./friendship-requests/friendship-requests.component";
import { HomeComponent } from "./home/home.component";
import { LoginComponent } from "./login/login.component";
import { ManageUsersComponent } from "./manage-users/manage-users.component";
import { MatchModule } from "./match/match.module";
import { MaterialModule } from "./match/modules/material/material.modules";
import { MatchesListComponent } from "./matches-list/matches-list.component";
import { PageNotFoundComponent } from "./page-not-found/page-not-found.component";
import { RegisterModeratorComponent } from "./register-moderator/register-moderator.component";
import { ResetCredentialsComponent } from "./reset-credentials/reset-credentials.component";
import { SearchFriendsComponent } from "./search-friends/search-friends.component";
import { SearchMatchesComponent } from "./search-matches/search-matches.component";
import { SignupComponent } from "./signup/signup.component";
import { StatsComponent } from "./stats/stats.component";
import { MatchComponent } from "./match/match.component";



@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PageNotFoundComponent,
    HomeComponent,
    BubbleMenuComponent,
    StatsComponent,
    SignupComponent,
    ResetCredentialsComponent,
    RegisterModeratorComponent,
    FriendsListComponent,
    SearchFriendsComponent,
    FriendshipRequestsComponent,
    ManageUsersComponent,
    SearchMatchesComponent,
    MatchesListComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    LayoutModule,
    HttpClientModule,
    MatchModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
