import { Component } from '@angular/core';
import { MessagesComponent } from '../../.../../../shared/messages/messages.component';

@Component({
  selector: 'app-owner-messages-page',
  standalone: true,
  imports: [MessagesComponent],
  template: `<app-messages context="owner" />`,
})
export class OwnerMessagesPageComponent {}