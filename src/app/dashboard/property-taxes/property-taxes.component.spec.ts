import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropertyTaxesComponent } from './property-taxes.component';

describe('PropertyTaxesComponent', () => {
  let component: PropertyTaxesComponent;
  let fixture: ComponentFixture<PropertyTaxesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertyTaxesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PropertyTaxesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
