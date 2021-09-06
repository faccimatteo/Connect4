import { TestBed } from '@angular/core/testing';

import { ModeratorguardService } from './moderatorguard.service';

describe('ModeratorguardService', () => {
  let service: ModeratorguardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModeratorguardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
