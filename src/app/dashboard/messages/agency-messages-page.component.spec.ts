import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgencyMessagesPageComponent } from './agency-messages-page.component';

describe('AgencyMessagesPageComponent', () => {
  let component: AgencyMessagesPageComponent;
  let fixture: ComponentFixture<AgencyMessagesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgencyMessagesPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AgencyMessagesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
