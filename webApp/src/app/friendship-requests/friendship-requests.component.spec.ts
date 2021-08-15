import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FriendshipRequestsComponent } from './friendship-requests.component';

describe('FriendshipRequestsComponent', () => {
  let component: FriendshipRequestsComponent;
  let fixture: ComponentFixture<FriendshipRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FriendshipRequestsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FriendshipRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
