import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Users, AlertTriangle, CheckCircle, Clock, X, Plus } from 'lucide-react';
import type { Client } from '../types/database.types';

export default function AccountantDashboard() {
  const { user, signOut } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewClient, setShowNewClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({
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

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('clients').insert({
        company_name: newClient.company_name,
        contact_person: newClient.contact_person,
        phone: newClient.phone || null,
        address: newClient.address || null,
        postal_code: newClient.postal_code || null,
        city: newClient.city || null,
        kvk_number: newClient.kvk_number || null,
        btw_number: newClient.btw_number || null,
        subscription_type: newClient.subscription_type,
      });
      if (error) throw error;
      setShowNewClient(false);
      setNewClient({ company_name: '', contact_person: '', phone: '', address: '', postal_code: '', city: '', kvk_number: '', btw_number: '', subscription_type: 'abonnement' });
      loadClients();
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
            <button className="btn-primary" onClick={() => setShowNewClient(true)}>
              <Plus className="w-4 h-4 mr-2 inline" />
              Nieuwe klant
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nog geen klanten toegevoegd.</p>
              <button className="btn-primary mt-4" onClick={() => setShowNewClient(true)}>Eerste klant toevoegen</button>
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
                    <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                        <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                          Bekijk details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showNewClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">Nieuwe klant toevoegen</h3>
              <button onClick={() => setShowNewClient(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam *</label>
                <input type="text" required className="input" value={newClient.company_name} onChange={e => setNewClient({...newClient, company_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon *</label>
                <input type="text" required className="input" value={newClient.contact_person} onChange={e => setNewClient({...newClient, contact_person: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                  <input type="text" className="input" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
                  <input type="text" className="input" value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <input type="text" className="input" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                  <input type="text" className="input" value={newClient.postal_code} onChange={e => setNewClient({...newClient, postal_code: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KVK nummer</label>
                  <input type="text" className="input" value={newClient.kvk_number} onChange={e => setNewClient({...newClient, kvk_number: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BTW nummer</label>
                <input type="text" className="input" value={newClient.btw_number} onChange={e => setNewClient({...newClient, btw_number: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type abonnement</label>
                <select className="input" value={newClient.subscription_type} onChange={e => setNewClient({...newClient, subscription_type: e.target.value as 'abonnement' | 'per_opdracht'})}>
                  <option value="abonnement">Abonnement</option>
                  <option value="per_opdracht">Per opdracht</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNewClient(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Annuleren
                </button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                  {saving ? 'Opslaan...' : 'Klant toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
