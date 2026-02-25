import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Users, AlertTriangle, CheckCircle, Clock, Plus, ArrowLeft, Building2, Phone, FileText, Save, CalendarDays, Trash2, ClipboardList, ChevronDown, ChevronRight, Send, MessageSquare, Package, Copy } from 'lucide-react';
import type { Client, DocumentCategory, ClientDocumentAssignment, DocumentChecklist, DocumentSet, DocumentSetItem } from '../types/database.types';

type View = 'list' | 'new' | 'detail' | 'sets';

export default function AccountantDashboard() {
  const { user, signOut } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
    kvk_number: '',
    btw_number: '',
    subscription_type: 'abonnement' as 'abonnement' | 'per_opdracht',
  });

  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [assignments, setAssignments] = useState<ClientDocumentAssignment[]>([]);
  const [checklistItems, setChecklistItems] = useState<DocumentChecklist[]>([]);
  const [assignDeadlines, setAssignDeadlines] = useState<Record<string, string>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<string>('other');
  const [newCatYear, setNewCatYear] = useState(new Date().getFullYear());
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string; subject: string; description: string; status: string; created_at: string}>>([]);
  const [docRequests, setDocRequests] = useState<Array<{id: string; title: string; description?: string; deadline?: string; status: string; sent_at?: string; created_at: string}>>([]);
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqDesc, setNewReqDesc] = useState('');
  const [newReqDeadline, setNewReqDeadline] = useState('');
  const [sendingRequests, setSendingRequests] = useState(false);
  const [sendIntro, setSendIntro] = useState('');
  const [docSets, setDocSets] = useState<DocumentSet[]>([]);
  const [docSetItems, setDocSetItems] = useState<DocumentSetItem[]>([]);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDesc, setNewSetDesc] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [applyingSet, setApplyingSet] = useState(false);

  const emptyForm = { company_name: '', contact_person: '', email: '', phone: '', address: '', postal_code: '', city: '', kvk_number: '', btw_number: '', subscription_type: 'abonnement' as 'abonnement' | 'per_opdracht' };

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('company_name');

      if (data) {
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  function openNewClient() {
    setFormData(emptyForm);
    setView('new');
  }

  async function openClientDetail(client: Client) {
    setSelectedClient(client);
    setFormData({
      company_name: client.company_name,
      contact_person: client.contact_person,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      postal_code: client.postal_code || '',
      city: client.city || '',
      kvk_number: client.kvk_number || '',
      btw_number: client.btw_number || '',
      subscription_type: client.subscription_type,
    });
    setView('detail');
    setDetailsOpen(false);
    await Promise.all([loadDocumentData(client.id), loadMessages(client.id), loadDocRequests(client.id), loadSets()]);
  }

  async function loadDocumentData(clientId: string) {
    const [catRes, assignRes, checkRes] = await Promise.all([
      supabase.from('document_categories').select('*').eq('is_active', true).order('year', { ascending: false }).order('sort_order'),
      supabase.from('client_document_assignments').select('*').eq('client_id', clientId),
      supabase.from('document_checklists').select('*').order('sort_order'),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (assignRes.data) {
      setAssignments(assignRes.data);
      const deadlines: Record<string, string> = {};
      assignRes.data.forEach((a: ClientDocumentAssignment) => {
        if (a.deadline) deadlines[a.category_id] = a.deadline.split('T')[0];
      });
      setAssignDeadlines(deadlines);
    }
    if (checkRes.data) setChecklistItems(checkRes.data);
  }

  async function toggleAssignment(categoryId: string) {
    if (!selectedClient) return;
    const existing = assignments.find(a => a.category_id === categoryId);
    if (existing) {
      await supabase.from('client_document_assignments').delete().eq('id', existing.id);
    } else {
      await supabase.from('client_document_assignments').insert({
        client_id: selectedClient.id,
        category_id: categoryId,
        deadline: assignDeadlines[categoryId] ? new Date(assignDeadlines[categoryId]).toISOString() : null,
      });
    }
    await loadDocumentData(selectedClient.id);
  }

  async function updateDeadline(categoryId: string, date: string) {
    setAssignDeadlines(prev => ({ ...prev, [categoryId]: date }));
    const existing = assignments.find(a => a.category_id === categoryId);
    if (existing) {
      await supabase.from('client_document_assignments').update({
        deadline: date ? new Date(date).toISOString() : null,
      }).eq('id', existing.id);
    }
  }

  async function createCategory() {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from('document_categories').insert({
      name: newCatName,
      category_type: newCatType,
      year: newCatYear,
      sort_order: categories.length + 1,
      is_active: true,
    });
    if (error) { alert('Fout: ' + error.message); return; }
    setNewCatName('');
    setShowNewCategory(false);
    if (selectedClient) await loadDocumentData(selectedClient.id);
  }

  async function loadSets() {
    const [setsRes, itemsRes] = await Promise.all([
      supabase.from('document_sets').select('*').order('created_at', { ascending: false }),
      supabase.from('document_set_items').select('*').order('sort_order'),
    ]);
    if (setsRes.data) setDocSets(setsRes.data);
    if (itemsRes.data) setDocSetItems(itemsRes.data);
  }

  async function createSet() {
    if (!newSetName.trim()) return;
    const { error } = await supabase.from('document_sets').insert({
      name: newSetName,
      description: newSetDesc || null,
      created_by: user?.id,
    });
    if (error) { alert('Fout: ' + error.message); return; }
    setNewSetName('');
    setNewSetDesc('');
    await loadSets();
  }

  async function addSetItem(setId: string) {
    if (!newItemTitle.trim()) return;
    const currentItems = docSetItems.filter(i => i.set_id === setId);
    const { error } = await supabase.from('document_set_items').insert({
      set_id: setId,
      title: newItemTitle,
      description: newItemDesc || null,
      sort_order: currentItems.length + 1,
    });
    if (error) { alert('Fout: ' + error.message); return; }
    setNewItemTitle('');
    setNewItemDesc('');
    await loadSets();
  }

  async function deleteSetItem(itemId: string) {
    await supabase.from('document_set_items').delete().eq('id', itemId);
    await loadSets();
  }

  async function deleteSet(setId: string) {
    if (!confirm('Set verwijderen? Alle items worden ook verwijderd.')) return;
    await supabase.from('document_sets').delete().eq('id', setId);
    if (editingSetId === setId) setEditingSetId(null);
    await loadSets();
  }

  async function applySetToClient(setId: string, deadline?: string) {
    if (!selectedClient) return;
    setApplyingSet(true);
    try {
      const items = docSetItems.filter(i => i.set_id === setId);
      if (items.length === 0) { alert('Deze set heeft geen documenten.'); return; }
      for (const item of items) {
        await supabase.from('document_requests').insert({
          client_id: selectedClient.id,
          title: item.title,
          description: item.description || null,
          deadline: deadline || null,
          status: 'pending',
          created_by: user?.id,
        });
      }
      await loadDocRequests(selectedClient.id);
      const setName = docSets.find(s => s.id === setId)?.name || 'Set';
      alert(`${items.length} documenten uit "${setName}" toegevoegd.`);
    } catch (err: any) {
      alert('Fout: ' + err.message);
    } finally {
      setApplyingSet(false);
    }
  }

  async function loadMessages(clientId: string) {
    const { data } = await supabase
      .from('tickets')
      .select('id, subject, description, status, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (data) setMessages(data);
  }

  async function loadDocRequests(clientId: string) {
    const { data } = await supabase
      .from('document_requests')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (data) setDocRequests(data);
  }

  async function addDocRequest() {
    if (!selectedClient || !newReqTitle.trim()) return;
    const { error } = await supabase.from('document_requests').insert({
      client_id: selectedClient.id,
      title: newReqTitle,
      description: newReqDesc || null,
      deadline: newReqDeadline || null,
      status: 'pending',
      created_by: user?.id,
    });
    if (error) { alert('Fout: ' + error.message); return; }
    setNewReqTitle('');
    setNewReqDesc('');
    setNewReqDeadline('');
    await loadDocRequests(selectedClient.id);
  }

  async function deleteDocRequest(id: string) {
    if (!selectedClient) return;
    await supabase.from('document_requests').delete().eq('id', id);
    await loadDocRequests(selectedClient.id);
  }

  async function sendDocRequestsEmail() {
    if (!selectedClient) return;
    const clientEmail = selectedClient.email || formData.email;
    if (!clientEmail) {
      alert('Vul eerst een emailadres in bij de bedrijfsgegevens.');
      return;
    }

    // Combine assigned categories + custom requests into one list
    const allItems: Array<{title: string; description: string; deadline: string}> = [];

    // 1. Category assignments
    for (const a of assignments) {
      const cat = categories.find(c => c.id === a.category_id);
      if (cat) {
        allItems.push({
          title: cat.name,
          description: cat.category_type === 'btw_quarter' ? 'BTW aangifte' : cat.category_type === 'annual_report' ? 'Jaarrekening' : cat.category_type === 'tax_return' ? 'Belastingaangifte' : cat.category_type === 'payroll' ? 'Loonadministratie' : 'Document',
          deadline: a.deadline ? new Date(a.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Geen deadline',
        });
      }
    }

    // 2. Custom document requests (pending only)
    const pendingReqs = docRequests.filter(r => r.status === 'pending');
    for (const r of pendingReqs) {
      allItems.push({
        title: r.title,
        description: r.description || '-',
        deadline: r.deadline ? new Date(r.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Geen deadline',
      });
    }

    if (allItems.length === 0) {
      alert('Geen documenten om te versturen. Vink eerst categorieën aan of voeg documenten toe.');
      return;
    }

    setSendingRequests(true);
    try {
      const itemsHtml = allItems.map(r =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280">${r.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#dc2626">${r.deadline}</td>
        </tr>`
      ).join('');

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientEmail,
          subject: `Documentverzoek - ${selectedClient.company_name}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="margin:0">Secure Finance Portal</h2>
              <p style="margin:5px 0 0;opacity:0.9">Documentverzoek</p>
            </div>
            <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <p>Beste ${selectedClient.contact_person},</p>
              ${sendIntro.trim() ? `<p style="white-space:pre-line">${sendIntro.trim()}</p>` : ''}
              <p>Wij hebben de volgende documenten van u nodig:</p>
              <table style="width:100%;border-collapse:collapse;margin:15px 0">
                <thead>
                  <tr style="background:#f3f4f6">
                    <th style="padding:8px 12px;text-align:left;font-size:13px">Document</th>
                    <th style="padding:8px 12px;text-align:left;font-size:13px">Toelichting</th>
                    <th style="padding:8px 12px;text-align:left;font-size:13px">Deadline</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <p>Kunt u deze documenten zo spoedig mogelijk aanleveren? U kunt reageren op deze email.</p>
              <p>Met vriendelijke groet,<br/>Uw boekhouder</p>
              <p style="color:#6b7280;font-size:12px;margin-top:20px">Verstuurd vanuit Secure Finance Portal</p>
            </div>
          </div>`,
          replyTo: user?.email,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Email verzenden mislukt');
      }

      // Mark custom requests as sent
      for (const r of pendingReqs) {
        await supabase.from('document_requests').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', r.id);
      }
      await loadDocRequests(selectedClient.id);
      setSendIntro('');
      if (result.demo) {
        alert(`✅ Test-modus: documentoverzicht (${allItems.length} items) gesimuleerd verstuurd naar ${clientEmail}.\n\nOm echt te versturen: verificeer je domein op resend.com/domains.`);
      } else {
        alert(`✅ Documentoverzicht (${allItems.length} items) verstuurd naar ${clientEmail}`);
      }
    } catch (err: any) {
      alert('Fout bij verzenden: ' + err.message);
    } finally {
      setSendingRequests(false);
    }
  }

  async function sendMessage() {
    if (!selectedClient || !message.trim()) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.from('tickets').insert({
        client_id: selectedClient.id,
        subject: 'Bericht van boekhouder',
        description: message,
        status: 'waiting_client',
        priority: 'normal',
        created_by: user?.id,
      });
      if (error) throw error;

      const clientEmail = selectedClient.email || formData.email;
      if (clientEmail) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: clientEmail,
              subject: `Bericht van uw boekhouder - ${selectedClient.company_name}`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0">
                  <h2 style="margin:0">Secure Finance Portal</h2>
                </div>
                <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
                  <p>Beste ${selectedClient.contact_person},</p>
                  <p>U heeft een nieuw bericht van uw boekhouder:</p>
                  <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0">
                    ${message.replace(/\n/g, '<br/>')}
                  </div>
                  <p style="color:#6b7280;font-size:13px">Dit is een automatisch bericht vanuit Secure Finance Portal.</p>
                </div>
              </div>`,
              replyTo: user?.email,
            }),
          });
        } catch {
          console.warn('Email kon niet verzonden worden, bericht is wel opgeslagen.');
        }
      }

      setMessage('');
      await loadMessages(selectedClient.id);
    } catch (err: any) {
      alert('Fout bij verzenden: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (view === 'new') {
        const { error } = await supabase.from('clients').insert({
          company_name: formData.company_name,
          contact_person: formData.contact_person,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          kvk_number: formData.kvk_number || null,
          btw_number: formData.btw_number || null,
          subscription_type: formData.subscription_type,
        });
        if (error) throw error;
      } else if (view === 'detail' && selectedClient) {
        const { error } = await supabase.from('clients').update({
          company_name: formData.company_name,
          contact_person: formData.contact_person,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          kvk_number: formData.kvk_number || null,
          btw_number: formData.btw_number || null,
          subscription_type: formData.subscription_type,
          updated_at: new Date().toISOString(),
        }).eq('id', selectedClient.id);
        if (error) throw error;
      }
      await loadClients();
      setView('list');
    } catch (err: any) {
      alert('Fout bij opslaan: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function getStatusLabel(score: number) {
    if (score >= 80) return { label: 'Compleet', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4 text-green-600" /> };
    if (score >= 50) return { label: 'In behandeling', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4 text-yellow-600" /> };
    if (score > 0) return { label: 'Actie nodig', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> };
    return { label: 'Nieuw', color: 'bg-gray-100 text-gray-600', icon: <FileText className="w-4 h-4 text-gray-400" /> };
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  function renderClientForm(isNew: boolean) {
    return (
      <form onSubmit={handleSaveClient} className="space-y-6">
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <Building2 className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-gray-900">Bedrijfsgegevens</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam *</label>
              <input type="text" required className="input" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon *</label>
              <input type="text" required className="input" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <Phone className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-gray-900">Contactgegevens</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input" placeholder="klant@bedrijf.nl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
              <input type="text" className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
              <input type="text" className="input" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
              <input type="text" className="input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
              <input type="text" className="input" value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-gray-900">Zakelijke gegevens</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KVK nummer</label>
              <input type="text" className="input" value={formData.kvk_number} onChange={e => setFormData({...formData, kvk_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BTW nummer</label>
              <input type="text" className="input" value={formData.btw_number} onChange={e => setFormData({...formData, btw_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type abonnement</label>
              <select className="input" value={formData.subscription_type} onChange={e => setFormData({...formData, subscription_type: e.target.value as 'abonnement' | 'per_opdracht'})}>
                <option value="abonnement">Abonnement</option>
                <option value="per_opdracht">Per opdracht</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setView('list')} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Annuleren
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 flex items-center space-x-2">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Opslaan...' : isNew ? 'Klant toevoegen' : 'Wijzigingen opslaan'}</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">SF</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Secure Finance - Boekhouder</h1>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5" />
              <span>Uitloggen</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'list' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                    <p className="text-sm text-gray-600">Actieve klanten</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {clients.filter(c => c.completeness_score >= 80).length}
                    </p>
                    <p className="text-sm text-gray-600">Compleet</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {clients.filter(c => c.completeness_score > 0 && c.completeness_score < 80).length}
                    </p>
                    <p className="text-sm text-gray-600">In behandeling</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {clients.filter(c => c.completeness_score === 0).length}
                    </p>
                    <p className="text-sm text-gray-600">Nieuw</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Klanten Overzicht</h3>
                <div className="flex items-center space-x-3">
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => { loadSets(); setView('sets'); }}>
                    <Package className="w-4 h-4" />
                    <span>Document Sets</span>
                  </button>
                  <button className="btn-primary" onClick={openNewClient}>
                    <Plus className="w-4 h-4 mr-2 inline" />
                    Nieuwe klant
                  </button>
                </div>
              </div>

              {clients.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nog geen klanten toegevoegd.</p>
                  <button className="btn-primary mt-4" onClick={openNewClient}>Eerste klant toevoegen</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Bedrijf</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Contactpersoon</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Volledigheid</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openClientDetail(client)}>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{client.company_name}</div>
                            <div className="text-sm text-gray-500">{client.city}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{client.contact_person}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              {client.subscription_type === 'abonnement' ? 'Abonnement' : 'Per opdracht'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                <div
                                  className={`h-2 rounded-full ${
                                    client.completeness_score >= 80
                                      ? 'bg-green-500'
                                      : client.completeness_score >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${client.completeness_score}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                {client.completeness_score}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {(() => {
                              const s = getStatusLabel(client.completeness_score);
                              return (
                                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
                                  {s.icon}
                                  <span>{s.label}</span>
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                              Bekijk details
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'new' && (
          <>
            <div className="flex items-center space-x-3 mb-6">
              <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Nieuwe klant toevoegen</h2>
            </div>
            {renderClientForm(true)}
          </>
        )}

        {view === 'sets' && (
          <>
            <div className="flex items-center space-x-3 mb-6">
              <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Document Sets</h2>
                <p className="text-sm text-gray-600">Maak herbruikbare sjablonen met documenten die je snel kunt toepassen op klanten.</p>
              </div>
            </div>

            {/* Nieuwe set aanmaken */}
            <div className="card mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Nieuwe set aanmaken</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <input type="text" placeholder="Naam (bijv. IB Aangifte)" className="input" value={newSetName} onChange={e => setNewSetName(e.target.value)} />
                </div>
                <div className="md:col-span-6">
                  <input type="text" placeholder="Omschrijving (optioneel)" className="input" value={newSetDesc} onChange={e => setNewSetDesc(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <button onClick={createSet} disabled={!newSetName.trim()} className="btn-primary w-full disabled:opacity-50">
                    <Plus className="w-4 h-4 mr-1 inline" />Aanmaken
                  </button>
                </div>
              </div>
            </div>

            {/* Bestaande sets */}
            {docSets.length === 0 ? (
              <div className="card text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nog geen document sets aangemaakt.</p>
                <p className="text-sm text-gray-500 mt-1">Maak hierboven een set aan, bijv. "IB Aangifte" of "BTW Kwartaal".</p>
              </div>
            ) : (
              <div className="space-y-4">
                {docSets.map(set => {
                  const items = docSetItems.filter(i => i.set_id === set.id);
                  const isOpen = editingSetId === set.id;
                  return (
                    <div key={set.id} className="card">
                      <div className="flex items-center justify-between">
                        <button onClick={() => setEditingSetId(isOpen ? null : set.id)} className="flex items-center space-x-3 flex-1 text-left">
                          {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                          <div>
                            <div className="flex items-center space-x-2">
                              <Package className="w-4 h-4 text-primary-600" />
                              <span className="font-bold text-gray-900">{set.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">{items.length} documenten</span>
                            </div>
                            {set.description && <p className="text-sm text-gray-500 mt-0.5 ml-6">{set.description}</p>}
                          </div>
                        </button>
                        <button onClick={() => deleteSet(set.id)} className="p-1.5 text-red-400 hover:text-red-600" title="Set verwijderen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="mt-4 ml-8 border-t border-gray-100 pt-4">
                          {/* Items in deze set */}
                          {items.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {items.map((item, idx) => (
                                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-gray-400 w-5">{idx + 1}.</span>
                                    <span className="text-sm font-medium text-gray-900">{item.title}</span>
                                    {item.description && <span className="text-xs text-gray-500">— {item.description}</span>}
                                  </div>
                                  <button onClick={() => deleteSetItem(item.id)} className="p-1 text-red-400 hover:text-red-600">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Nieuw item toevoegen */}
                          <div className="flex space-x-2">
                            <input type="text" placeholder="Document naam (bijv. Jaaropgave bank)" className="input flex-1 text-sm" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} />
                            <input type="text" placeholder="Toelichting (optioneel)" className="input flex-1 text-sm" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} />
                            <button onClick={() => addSetItem(set.id)} disabled={!newItemTitle.trim()} className="btn-primary disabled:opacity-50 text-sm whitespace-nowrap">
                              <Plus className="w-3.5 h-3.5 mr-1 inline" />Toevoegen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {view === 'detail' && selectedClient && (
          <>
            <div className="flex items-center space-x-3 mb-6">
              <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedClient.company_name}</h2>
                <p className="text-sm text-gray-600">{selectedClient.contact_person} · {selectedClient.city}</p>
              </div>
            </div>

            {/* Status overzicht + actiepunten */}
            {(() => {
              const alerts: Array<{type: 'error' | 'warning' | 'info' | 'success'; text: string}> = [];
              const noEmail = !selectedClient.email && !formData.email;
              const noAssignments = assignments.length === 0;
              const withoutDeadline = assignments.filter(a => !a.deadline);
              const overdue = assignments.filter(a => a.deadline && new Date(a.deadline) < new Date());
              const upcoming = assignments.filter(a => {
                if (!a.deadline) return false;
                const d = new Date(a.deadline);
                const now = new Date();
                const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                return d >= now && d <= inWeek;
              });

              if (overdue.length > 0) {
                const names = overdue.map(a => categories.find(c => c.id === a.category_id)?.name).filter(Boolean);
                alerts.push({ type: 'error', text: `${overdue.length} verlopen deadline${overdue.length > 1 ? 's' : ''}: ${names.join(', ')}` });
              }
              if (upcoming.length > 0) {
                const names = upcoming.map(a => categories.find(c => c.id === a.category_id)?.name).filter(Boolean);
                alerts.push({ type: 'warning', text: `${upcoming.length} deadline${upcoming.length > 1 ? 's' : ''} deze week: ${names.join(', ')}` });
              }
              if (withoutDeadline.length > 0) {
                const names = withoutDeadline.map(a => categories.find(c => c.id === a.category_id)?.name).filter(Boolean);
                alerts.push({ type: 'info', text: `${withoutDeadline.length} ${withoutDeadline.length === 1 ? 'categorie' : 'categorieën'} zonder deadline: ${names.join(', ')}` });
              }
              if (noEmail && !noAssignments) alerts.push({ type: 'info', text: 'Tip: vul een emailadres in om documenten per email te versturen.' });
              if (alerts.length === 0) alerts.push({ type: 'success', text: noAssignments ? 'Nieuwe klant — wijs hieronder documenten toe om te beginnen.' : 'Alles op orde. Geen openstaande actiepunten.' });

              const colorMap = { error: 'bg-red-50 border-red-200 text-red-800', warning: 'bg-yellow-50 border-yellow-200 text-yellow-800', info: 'bg-blue-50 border-blue-200 text-blue-800', success: 'bg-green-50 border-green-200 text-green-800' };
              const iconMap = { error: <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />, warning: <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />, info: <CalendarDays className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />, success: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> };

              return (
                <div className="mb-6 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Actiepunten</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span><span className="font-medium text-gray-900">{assignments.length}</span> categorieën</span>
                      <span><span className="font-medium text-gray-900">{messages.length}</span> berichten</span>
                    </div>
                  </div>
                  {alerts.map((alert, i) => (
                    <div key={i} className={`flex items-start space-x-3 px-4 py-3 rounded-lg border ${colorMap[alert.type]}`}>
                      {iconMap[alert.type]}
                      <span className="text-sm">{alert.text}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Inklapbare bedrijfsgegevens */}
            <div className="card mb-6">
              <button type="button" onClick={() => setDetailsOpen(!detailsOpen)} className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-bold text-gray-900">Bedrijfsgegevens</h3>
                </div>
                {detailsOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {!detailsOpen && (
                <p className="text-sm text-gray-500 mt-2">{formData.company_name} · {formData.contact_person} · {formData.city || 'Geen stad'} · {formData.subscription_type === 'abonnement' ? 'Abonnement' : 'Per opdracht'}</p>
              )}
              {detailsOpen && (
                <form onSubmit={handleSaveClient} className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam *</label>
                      <input type="text" required className="input" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon *</label>
                      <input type="text" required className="input" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" className="input" placeholder="klant@bedrijf.nl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                      <input type="text" className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
                      <input type="text" className="input" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                      <input type="text" className="input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                      <input type="text" className="input" value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">KVK nummer</label>
                      <input type="text" className="input" value={formData.kvk_number} onChange={e => setFormData({...formData, kvk_number: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">BTW nummer</label>
                      <input type="text" className="input" value={formData.btw_number} onChange={e => setFormData({...formData, btw_number: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type abonnement</label>
                      <select className="input" value={formData.subscription_type} onChange={e => setFormData({...formData, subscription_type: e.target.value as 'abonnement' | 'per_opdracht'})}>
                        <option value="abonnement">Abonnement</option>
                        <option value="per_opdracht">Per opdracht</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Opslaan...' : 'Wijzigingen opslaan'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Documenten voor klant - geïntegreerde sectie */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <ClipboardList className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-bold text-gray-900">Documenten voor klant</h3>
                </div>
                <button onClick={() => setShowNewCategory(!showNewCategory)} className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1">
                  <Plus className="w-4 h-4" />
                  <span>Nieuwe categorie</span>
                </button>
              </div>

              {/* Set toepassen */}
              {docSets.length > 0 && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Copy className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-medium text-primary-900">Set toepassen op deze klant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select id="setSelect" className="input flex-1 text-sm" defaultValue="">
                      <option value="" disabled>Kies een document set...</option>
                      {docSets.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({docSetItems.filter(i => i.set_id === s.id).length} documenten)</option>
                      ))}
                    </select>
                    <input type="date" id="setDeadline" className="input text-sm w-40" placeholder="Deadline" />
                    <button
                      onClick={() => {
                        const sel = (document.getElementById('setSelect') as HTMLSelectElement)?.value;
                        const dl = (document.getElementById('setDeadline') as HTMLInputElement)?.value;
                        if (sel) applySetToClient(sel, dl || undefined);
                      }}
                      disabled={applyingSet}
                      className="btn-primary disabled:opacity-50 text-sm whitespace-nowrap"
                    >
                      <Package className="w-4 h-4 mr-1 inline" />{applyingSet ? 'Bezig...' : 'Toepassen'}
                    </button>
                  </div>
                </div>
              )}

              {showNewCategory && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Nieuwe document categorie</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" placeholder="Naam (bijv. Loonheffing Q1)" className="input" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                    <select className="input" value={newCatType} onChange={e => setNewCatType(e.target.value)}>
                      <option value="btw_quarter">BTW kwartaal</option>
                      <option value="annual_report">Jaarrekening</option>
                      <option value="payroll">Loonadministratie</option>
                      <option value="tax_return">Belastingaangifte</option>
                      <option value="other">Overig</option>
                    </select>
                    <div className="flex space-x-2">
                      <input type="number" placeholder="Jaar" className="input" value={newCatYear} onChange={e => setNewCatYear(parseInt(e.target.value))} />
                      <button onClick={createCategory} className="btn-primary whitespace-nowrap">Toevoegen</button>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-2">Stap 1: Vink categorieën aan en stel deadlines in.</p>

              {categories.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Geen document categorieën gevonden.</p>
              ) : (
                <div className="space-y-2 mb-6">
                  {categories.map(cat => {
                    const isAssigned = assignments.some(a => a.category_id === cat.id);
                    const catChecklist = checklistItems.filter(ci => ci.category_id === cat.id);
                    return (
                      <div key={cat.id} className={`border rounded-lg p-3 transition-colors ${isAssigned ? 'border-primary-300 bg-primary-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => toggleAssignment(cat.id)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <div>
                              <span className="font-medium text-gray-900">{cat.name}</span>
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {cat.category_type === 'btw_quarter' ? 'BTW' : cat.category_type === 'annual_report' ? 'Jaarrekening' : cat.category_type === 'tax_return' ? 'Aangifte' : cat.category_type === 'payroll' ? 'Loon' : 'Overig'}
                              </span>
                            </div>
                          </label>
                          {isAssigned && (
                            <div className="flex items-center space-x-2">
                              <CalendarDays className="w-4 h-4 text-gray-400" />
                              <input
                                type="date"
                                value={assignDeadlines[cat.id] || ''}
                                onChange={e => updateDeadline(cat.id, e.target.value)}
                                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-primary-500 focus:border-primary-500"
                              />
                              <button onClick={() => toggleAssignment(cat.id)} className="p-1 text-red-400 hover:text-red-600" title="Verwijderen">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        {isAssigned && catChecklist.length > 0 && (
                          <div className="mt-2 ml-7 space-y-1">
                            {catChecklist.map(item => (
                              <div key={item.id} className="flex items-center space-x-2 text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                <span>{item.item_name}</span>
                                {item.is_required && <span className="text-xs text-red-500">*verplicht</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Extra documenten toevoegen */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-sm text-gray-500 mb-2">Stap 2: Voeg eventueel extra specifieke documenten toe.</p>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-4">
                      <input type="text" placeholder="Document (bijv. Jaaropgave bank 2024)" className="input text-sm" value={newReqTitle} onChange={e => setNewReqTitle(e.target.value)} />
                    </div>
                    <div className="md:col-span-4">
                      <input type="text" placeholder="Toelichting (optioneel)" className="input text-sm" value={newReqDesc} onChange={e => setNewReqDesc(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <input type="date" className="input text-sm" value={newReqDeadline} onChange={e => setNewReqDeadline(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <button onClick={addDocRequest} disabled={!newReqTitle.trim()} className="btn-primary w-full disabled:opacity-50 text-sm">
                        <Plus className="w-3 h-3 mr-1 inline" />Toevoegen
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lijst van custom items */}
              {docRequests.length > 0 && (
                <div className="space-y-2 mb-4">
                  {docRequests.map(req => {
                    const statusColors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', sent: 'bg-blue-100 text-blue-800', received: 'bg-green-100 text-green-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };
                    const statusLabels: Record<string, string> = { pending: 'Nog niet verstuurd', sent: 'Verstuurd', received: 'Ontvangen', approved: 'Goedgekeurd', rejected: 'Afgekeurd' };
                    return (
                      <div key={req.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 text-sm">{req.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[req.status] || 'bg-gray-100 text-gray-600'}`}>
                              {statusLabels[req.status] || req.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                            {req.description && <span>{req.description}</span>}
                            {req.deadline && (
                              <span className="flex items-center space-x-1">
                                <CalendarDays className="w-3 h-3" />
                                <span>{new Date(req.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              </span>
                            )}
                            {req.sent_at && <span>Verstuurd: {new Date(req.sent_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>}
                          </div>
                        </div>
                        <button onClick={() => deleteDocRequest(req.id)} className="p-1 text-red-400 hover:text-red-600 ml-2" title="Verwijderen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Verstuur met voorwoord */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500 mb-2">Stap 3: Schrijf een persoonlijk bericht en verstuur alles per email.</p>
                <textarea
                  rows={3}
                  className="input w-full mb-3 text-sm"
                  placeholder="Voorwoord (optioneel) — bijv. 'Graag ontvangen wij onderstaande documenten voor uw IB aangifte 2024. De deadline is 1 mei.'"
                  value={sendIntro}
                  onChange={e => setSendIntro(e.target.value)}
                />
                <button
                  onClick={sendDocRequestsEmail}
                  disabled={sendingRequests || (assignments.length === 0 && docRequests.filter(r => r.status === 'pending').length === 0)}
                  className="btn-primary w-full disabled:opacity-50 flex items-center justify-center space-x-2 py-3"
                >
                  <Send className="w-5 h-5" />
                  <span>{sendingRequests ? 'Verzenden...' : `Verstuur documentoverzicht naar klant (${assignments.length + docRequests.filter(r => r.status === 'pending').length} items)`}</span>
                </button>
                {(!selectedClient?.email && !formData.email) && (
                  <p className="text-xs text-red-500 mt-2 text-center">Vul eerst een emailadres in bij Bedrijfsgegevens</p>
                )}
              </div>
            </div>

            {/* Berichten */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">Berichten</h3>
              </div>

              <div className="flex space-x-3 mb-4">
                <textarea
                  rows={2}
                  className="input flex-1"
                  placeholder="Schrijf een bericht aan deze klant..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <button onClick={sendMessage} disabled={sendingMessage || !message.trim()} className="btn-primary self-end disabled:opacity-50 flex items-center space-x-2 h-10">
                  <Send className="w-4 h-4" />
                  <span>{sendingMessage ? 'Verzenden...' : 'Verstuur'}</span>
                </button>
              </div>

              {messages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nog geen berichten voor deze klant.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {messages.map(msg => (
                    <div key={msg.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900">{msg.subject}</span>
                        <span className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-gray-600">{msg.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
