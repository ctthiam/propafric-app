import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerLayoutComponent } from './owner-layout.component';

describe('OwnerLayoutComponent', () => {
  let component: OwnerLayoutComponent;
  let fixture: ComponentFixture<OwnerLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerLayoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OwnerLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
