import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerTaxesComponent } from './owner-taxes.component';

describe('OwnerTaxesComponent', () => {
  let component: OwnerTaxesComponent;
  let fixture: ComponentFixture<OwnerTaxesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerTaxesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OwnerTaxesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
