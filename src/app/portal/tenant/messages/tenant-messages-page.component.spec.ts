import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantMessagesPageComponent } from './tenant-messages-page.component';

describe('TenantMessagesPageComponent', () => {
  let component: TenantMessagesPageComponent;
  let fixture: ComponentFixture<TenantMessagesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantMessagesPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TenantMessagesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
