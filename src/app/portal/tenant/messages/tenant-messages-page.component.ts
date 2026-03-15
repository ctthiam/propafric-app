import { Component } from '@angular/core';
import { MessagesComponent } from '../../.../../../shared/messages/messages.component';

@Component({
  selector: 'app-tenant-messages-page',
  standalone: true,
  imports: [MessagesComponent],
  template: `<app-messages context="tenant" />`,
})
export class TenantMessagesPageComponent {}