import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MaterialModule } from '../material/material.modules';
import { BannerInfoComponent } from './components/banner-info/banner-info.component';
import { BoardComponent } from './components/board/board.component';
import { ChatComponent } from './components/chat/chat.component';
import { DiskComponent } from './components/disk/disk.component';

@NgModule({
    declarations: [
      BoardComponent,
      DiskComponent,
      BannerInfoComponent,
      ChatComponent
    ],
    imports: [
      CommonModule,
      RouterModule,
      MaterialModule,
      FormsModule
    ],
    exports: [
      BoardComponent,
      BannerInfoComponent,
      ChatComponent,
      MaterialModule,
      FormsModule
    ]
})
export class Connect4Module {}
