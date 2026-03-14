import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerPropertiesComponent } from './owner-properties.component';

describe('OwnerPropertiesComponent', () => {
  let component: OwnerPropertiesComponent;
  let fixture: ComponentFixture<OwnerPropertiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerPropertiesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OwnerPropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
