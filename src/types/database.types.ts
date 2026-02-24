export type UserRole = 'accountant' | 'client';

export type SubscriptionType = 'abonnement' | 'per_opdracht';

export type CategoryType = 'btw_quarter' | 'annual_report' | 'payroll' | 'tax_return' | 'other';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export type TicketStatus = 'open' | 'waiting_client' | 'waiting_accountant' | 'closed';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ReminderType = 'before_deadline' | 'on_deadline' | 'after_deadline' | 'final_warning';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  kvk_number?: string;
  btw_number?: string;
  subscription_type: SubscriptionType;
  is_active: boolean;
  completeness_score: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  category_type: CategoryType;
  year: number;
  quarter?: number;
  sort_order: number;
  is_active: boolean;
}

export interface DocumentChecklist {
  id: string;
  category_id: string;
  item_name: string;
  description?: string;
  is_required: boolean;
  sort_order: number;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  category_id: string;
  checklist_item_id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: DocumentStatus;
  rejection_reason?: string;
  uploaded_by: string;
  uploaded_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
}

export interface Ticket {
  id: string;
  client_id: string;
  category_id?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: string;
  assigned_to?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  message_id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Reminder {
  id: string;
  client_id: string;
  category_id: string;
  reminder_type: ReminderType;
  days_offset: number;
  sent_at?: string;
  email_subject: string;
  email_body: string;
  is_sent: boolean;
}

export interface ReminderSettings {
  id: string;
  category_id: string;
  days_before_deadline: number[];
  days_after_deadline: number[];
  enable_fee_warning: boolean;
  fee_after_reminders: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  client_id?: string;
  action_type: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}
