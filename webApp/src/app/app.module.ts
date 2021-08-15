import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSliderModule } from '@angular/material/slider';
import { LoginComponent } from './login/login.component';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { LayoutModule } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { HttpClientModule } from '@angular/common/http';
import { HomeComponent } from './home/home.component';
import { BubbleMenuComponent } from './bubble-menu/bubble-menu.component';
import { StatsComponent } from './stats/stats.component';
import { MatTableModule } from '@angular/material/table';
import { NgChatModule } from 'ng-chat';
import { ChatComponent } from './chat/chat.component';
import { FormsModule } from '@angular/forms';
import { SignupComponent } from './signup/signup.component';
import { ResetCredentialsComponent } from './reset-credentials/reset-credentials.component';
import { RegisterModeratorComponent } from './register-moderator/register-moderator.component';
import { FriendsListComponent } from './friends-list/friends-list.component';
import { MatMenuModule } from '@angular/material/menu';
import { SearchFriendsComponent } from './search-friends/search-friends.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FriendshipRequestsComponent } from './friendship-requests/friendship-requests.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PageNotFoundComponent,
    HomeComponent,
    BubbleMenuComponent,
    StatsComponent,
    ChatComponent,
    SignupComponent,
    ResetCredentialsComponent,
    RegisterModeratorComponent,
    FriendsListComponent,
    SearchFriendsComponent,
    FriendshipRequestsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatSliderModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatRadioModule,
    MatCardModule,
    ReactiveFormsModule,
    LayoutModule,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatCheckboxModule,
    HttpClientModule,
    MatTableModule,
    NgChatModule,
    FormsModule,
    MatMenuModule,
    MatAutocompleteModule,
    MatSnackBarModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
