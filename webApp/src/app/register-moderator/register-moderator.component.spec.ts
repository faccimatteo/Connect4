import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterModeratorComponent } from './register-moderator.component';

describe('RegisterModeratorComponent', () => {
  let component: RegisterModeratorComponent;
  let fixture: ComponentFixture<RegisterModeratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegisterModeratorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterModeratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
