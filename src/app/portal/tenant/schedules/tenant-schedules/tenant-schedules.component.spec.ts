import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantSchedulesComponent } from './tenant-schedules.component';

describe('TenantSchedulesComponent', () => {
  let component: TenantSchedulesComponent;
  let fixture: ComponentFixture<TenantSchedulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantSchedulesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TenantSchedulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
