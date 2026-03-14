import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantReceiptsComponent } from './tenant-receipts.component';

describe('TenantReceiptsComponent', () => {
  let component: TenantReceiptsComponent;
  let fixture: ComponentFixture<TenantReceiptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantReceiptsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TenantReceiptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
