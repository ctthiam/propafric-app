import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantLeaseComponent } from './tenant-lease.component';

describe('TenantLeaseComponent', () => {
  let component: TenantLeaseComponent;
  let fixture: ComponentFixture<TenantLeaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantLeaseComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TenantLeaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
