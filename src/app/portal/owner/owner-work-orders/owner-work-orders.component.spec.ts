import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerWorkOrdersComponent } from './owner-work-orders.component';

describe('OwnerWorkOrdersComponent', () => {
  let component: OwnerWorkOrdersComponent;
  let fixture: ComponentFixture<OwnerWorkOrdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerWorkOrdersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OwnerWorkOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
