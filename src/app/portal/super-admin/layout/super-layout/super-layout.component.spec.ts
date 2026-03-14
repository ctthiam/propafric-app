import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperLayoutComponent } from './super-layout.component';

describe('SuperLayoutComponent', () => {
  let component: SuperLayoutComponent;
  let fixture: ComponentFixture<SuperLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperLayoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SuperLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
