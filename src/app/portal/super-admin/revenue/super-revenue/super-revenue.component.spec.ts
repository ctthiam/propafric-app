import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperRevenueComponent } from './super-revenue.component';

describe('SuperRevenueComponent', () => {
  let component: SuperRevenueComponent;
  let fixture: ComponentFixture<SuperRevenueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperRevenueComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SuperRevenueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
