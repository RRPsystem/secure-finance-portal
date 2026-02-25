import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Users, AlertTriangle, CheckCircle, Clock, Plus, ArrowLeft, Building2, Phone, FileText, Save, CalendarDays, Trash2, ClipboardList } from 'lucide-react';
import type { Client, DocumentCategory, ClientDocumentAssignment, DocumentChecklist } from '../types/database.types';

type View = 'list' | 'new' | 'detail';

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

  const emptyForm = { company_name: '', contact_person: '', phone: '', address: '', postal_code: '', city: '', kvk_number: '', btw_number: '', subscription_type: 'abonnement' as 'abonnement' | 'per_opdracht' };

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
      phone: client.phone || '',
      address: client.address || '',
      postal_code: client.postal_code || '',
      city: client.city || '',
      kvk_number: client.kvk_number || '',
      btw_number: client.btw_number || '',
      subscription_type: client.subscription_type,
    });
    setView('detail');
    await loadDocumentData(client.id);
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

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (view === 'new') {
        const { error } = await supabase.from('clients').insert({
          company_name: formData.company_name,
          contact_person: formData.contact_person,
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

  function getStatusColor(score: number) {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  function getStatusIcon(score: number) {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 50) return <Clock className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
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
                      {clients.filter(c => c.completeness_score >= 50 && c.completeness_score < 80).length}
                    </p>
                    <p className="text-sm text-gray-600">In behandeling</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {clients.filter(c => c.completeness_score < 50).length}
                    </p>
                    <p className="text-sm text-gray-600">Aandacht nodig</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Klanten Overzicht</h3>
                <button className="btn-primary" onClick={openNewClient}>
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Nieuwe klant
                </button>
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
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(client.completeness_score)}
                              <span className={`text-sm font-medium ${getStatusColor(client.completeness_score)}`}>
                                {client.completeness_score >= 80 ? 'Compleet' : client.completeness_score >= 50 ? 'Bezig' : 'Actie nodig'}
                              </span>
                            </div>
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

        {view === 'detail' && selectedClient && (
          <>
            <div className="flex items-center space-x-3 mb-6">
              <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedClient.company_name}</h2>
                <p className="text-sm text-gray-600">{selectedClient.contact_person}</p>
              </div>
            </div>
            {renderClientForm(false)}

            <div className="mt-8">
              <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                  <ClipboardList className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-bold text-gray-900">Documenten & Deadlines</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">Vink aan welke documentcategorieën deze klant moet inleveren en stel deadlines in.</p>

                {categories.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Geen document categorieën gevonden. Voer eerst de SQL uit in Supabase.</p>
                ) : (
                  <div className="space-y-3">
                    {categories.map(cat => {
                      const isAssigned = assignments.some(a => a.category_id === cat.id);
                      const catChecklist = checklistItems.filter(ci => ci.category_id === cat.id);
                      return (
                        <div key={cat.id} className={`border rounded-lg p-4 transition-colors ${isAssigned ? 'border-primary-300 bg-primary-50' : 'border-gray-200'}`}>
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
                                  {cat.category_type === 'btw_quarter' ? 'BTW' : cat.category_type === 'annual_report' ? 'Jaarrekening' : cat.category_type === 'tax_return' ? 'Aangifte' : cat.category_type}
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
                            <div className="mt-3 ml-7 space-y-1">
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

                {assignments.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{assignments.length}</span> {assignments.length === 1 ? 'categorie' : 'categorieën'} toegewezen aan deze klant
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
