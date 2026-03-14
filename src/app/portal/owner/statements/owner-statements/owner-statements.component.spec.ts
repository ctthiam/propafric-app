import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerStatementsComponent } from './owner-statements.component';

describe('OwnerStatementsComponent', () => {
  let component: OwnerStatementsComponent;
  let fixture: ComponentFixture<OwnerStatementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerStatementsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OwnerStatementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
