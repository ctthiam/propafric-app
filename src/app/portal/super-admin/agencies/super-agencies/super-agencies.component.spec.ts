import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperAgenciesComponent } from './super-agencies.component';

describe('SuperAgenciesComponent', () => {
  let component: SuperAgenciesComponent;
  let fixture: ComponentFixture<SuperAgenciesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperAgenciesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SuperAgenciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
