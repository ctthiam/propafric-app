import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerMessagesPageComponent } from './owner-messages-page.component';

describe('OwnerMessagesPageComponent', () => {
  let component: OwnerMessagesPageComponent;
  let fixture: ComponentFixture<OwnerMessagesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerMessagesPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OwnerMessagesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
