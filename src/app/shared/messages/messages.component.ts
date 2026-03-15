import { Component, OnInit, OnDestroy, Input, signal, computed, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastModule }    from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { environment }    from '../../../environments/environment';

export interface Conversation {
  id: number;
  subject: string;
  last_message_at: string | null;
  unread_count: number;
  last_message: { body: string; is_mine: boolean; created_at: string } | null;
}

export interface Message {
  id: number;
  body: string;
  is_mine: boolean;
  is_read: boolean;
  created_at: string;
  sender: { name: string; role: string } | null;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, SkeletonModule],
  providers: [MessageService],
  templateUrl: './messages.component.html',
  styleUrls:  ['./messages.component.scss'],
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  // 'agency' | 'tenant' | 'owner'
  @Input() context: 'agency' | 'tenant' | 'owner' = 'agency';
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

  conversations    = signal<Conversation[]>([]);
  activeConv       = signal<Conversation | null>(null);
  messages         = signal<Message[]>([]);
  loadingConvs     = signal(true);
  loadingMessages  = signal(false);
  sending          = signal(false);
  newConvOpen      = false;
  shouldScroll     = false;

  searchConv = signal('');
  filteredConvs = computed(() => {
    const q = this.searchConv().toLowerCase();
    if (!q) return this.conversations();
    return this.conversations().filter(c => c.subject.toLowerCase().includes(q));
  });

  messageForm: FormGroup;
  newConvForm: FormGroup;

  private pollInterval: any;

  get apiBase(): string {
    return {
      agency: `${environment.apiUrl}/agency/conversations`,
      tenant: `${environment.apiUrl}/portal/tenant/conversations`,
      owner:  `${environment.apiUrl}/portal/owner/conversations`,
    }[this.context];
  }

  // Contacts disponibles pour l'agence (tenants + owners)
  contactType  = signal<'tenant' | 'owner'>('tenant');
  contacts     = signal<{id: number; name: string; type: string}[]>([]);

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.messageForm = this.fb.group({ body: ['', Validators.required] });
    // newConvForm initialisé dans ngOnInit quand context est connu
    this.newConvForm = this.fb.group({
      subject: ['', Validators.required],
      message: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Initialiser le form avec les bons champs selon le contexte
    if (this.context === 'agency') {
      this.newConvForm = this.fb.group({
        subject: ['', Validators.required],
        message: ['', Validators.required],
        type_b:  ['tenant', Validators.required],
        id_b:    ['', Validators.required],
      });
      this.loadAgencyContacts('tenant');
    }
    this.loadConversations();
    this.pollInterval = setInterval(() => {
      if (this.activeConv()) this.loadMessages(this.activeConv()!.id, false);
      else this.loadConversations(false);
    }, 15_000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollBottom();
      this.shouldScroll = false;
    }
  }

  loadConversations(showLoader = true): void {
    if (showLoader) this.loadingConvs.set(true);
    this.http.get<any>(this.apiBase).subscribe({
      next: (res: any) => {
        this.conversations.set(Array.isArray(res?.data) ? res.data : []);
        this.loadingConvs.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loadingConvs.set(false),
    });
  }

  selectConversation(conv: Conversation): void {
    this.activeConv.set(conv);
    this.loadMessages(conv.id);
  }

  loadMessages(id: number, showLoader = true): void {
    if (showLoader) this.loadingMessages.set(true);
    this.http.get<any>(`${this.apiBase}/${id}/messages`).subscribe({
      next: (res: any) => {
        const msgs = Array.isArray(res?.data?.messages) ? res.data.messages : [];
        this.messages.set(msgs);
        this.loadingMessages.set(false);
        this.shouldScroll = true;
        // Mettre à jour unread_count dans la liste
        this.conversations.update(list =>
          list.map(c => c.id === id ? { ...c, unread_count: 0 } : c)
        );
        this.cdr.detectChanges();
      },
      error: () => this.loadingMessages.set(false),
    });
  }

  sendMessage(): void {
    if (this.messageForm.invalid || !this.activeConv()) return;
    this.sending.set(true);
    const id = this.activeConv()!.id;

    this.http.post<any>(`${this.apiBase}/${id}/messages`, this.messageForm.value).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.messages.update(list => [...list, res.data]);
        }
        this.messageForm.reset();
        this.sending.set(false);
        this.shouldScroll = true;
        this.cdr.detectChanges();
        // Refresh conversations list
        this.loadConversations(false);
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Envoi impossible.' });
        this.sending.set(false);
      }
    });
  }

  loadAgencyContacts(type: 'tenant' | 'owner'): void {
    const endpoint = type === 'tenant'
      ? `${environment.apiUrl}/agency/tenants`
      : `${environment.apiUrl}/agency/owners`;
    this.http.get<any>(endpoint).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.contacts.set(list.map((c: any) => ({
          id:   c.id,
          name: c.full_name ?? `${c.first_name} ${c.last_name}`,
          type,
        })));
        this.cdr.detectChanges();
      }
    });
  }

  onContactTypeChange(e: Event): void {
    const type = (e.target as HTMLSelectElement).value as 'tenant' | 'owner';
    this.contactType.set(type);
    this.newConvForm.patchValue({ type_b: type, id_b: '' });
    this.loadAgencyContacts(type);
  }

  openNewConv(): void {
    if (this.context === 'agency') {
      this.newConvForm.reset({ type_b: 'tenant', id_b: '' });
      this.loadAgencyContacts('tenant');
    } else {
      this.newConvForm.reset();
    }
    this.newConvOpen = true;
    this.cdr.detectChanges();
  }

  closeNewConv(): void {
    this.newConvOpen = false;
    this.cdr.detectChanges();
  }

  submitNewConv(): void {
    if (this.newConvForm.invalid) { this.newConvForm.markAllAsTouched(); return; }
    this.sending.set(true);

    this.http.post<any>(this.apiBase, this.newConvForm.value).subscribe({
      next: (res: any) => {
        this.sending.set(false);
        this.closeNewConv();
        this.loadConversations();
        const convId = res?.data?.conversation_id;
        if (convId) {
          // Ouvrir la conversation créée
          setTimeout(() => {
            const conv = this.conversations().find(c => c.id === convId);
            if (conv) this.selectConversation(conv);
          }, 600);
        }
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.sending.set(false);
      }
    });
  }

  onSearch(e: Event): void { this.searchConv.set((e.target as HTMLInputElement).value); }

  onEnterKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  private scrollBottom(): void {
    try { this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  timeAgo(d: string): string {
    if (!d) return '';
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60)    return 'À l\'instant';
    if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short' });
  }

  formatTime(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit' });
  }

  get totalUnread(): number {
    return this.conversations().reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
  }

  get contextTitle(): string {
    return { agency: 'Messages', tenant: 'Messages', owner: 'Messages' }[this.context];
  }
}