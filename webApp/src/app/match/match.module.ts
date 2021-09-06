import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { NgxsModule } from '@ngxs/store';

import { environment } from '../../environments/environment.prod';
import { MatchComponent, MatchDialogData } from './match.component';
import { Connect4Module } from './modules/connect4/connect4.module';
import { MaterialModule } from './modules/material/material.modules';
import { ThemingService } from './shared/services/theming/theming.service';
import RootState from './ngxs/state/root.state';
import { ChatComponent } from './modules/connect4/components/chat/chat.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';


@NgModule({
    declarations: [
      MatchComponent,
      MatchDialogData
    ],
    imports: [
      BrowserModule,
      BrowserAnimationsModule,
      Connect4Module,
      NgxsModule.forRoot([...RootState], {
          developmentMode: !environment.production
      }),
      NgxsReduxDevtoolsPluginModule.forRoot(),
      NgxsLoggerPluginModule.forRoot(),
      MaterialModule
    ],
    exports: [
      MaterialModule,
      ChatComponent,
      FormsModule
    ],
    providers: [
      ThemingService
    ],
    bootstrap: [MatchComponent]
})
export class MatchModule {}
