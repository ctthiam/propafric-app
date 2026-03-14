import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerSchedulesComponent } from './owner-schedules.component';

describe('OwnerSchedulesComponent', () => {
  let component: OwnerSchedulesComponent;
  let fixture: ComponentFixture<OwnerSchedulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerSchedulesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OwnerSchedulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
