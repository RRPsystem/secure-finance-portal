import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Upload, CheckCircle, AlertCircle, Clock, FileText, MessageSquare } from 'lucide-react';
import type { Client, DocumentCategory } from '../types/database.types';

export default function ClientDashboard() {
  const { user, signOut } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [user]);

  async function loadClientData() {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientData) {
        setClient(clientData);
      }

      const { data: categoriesData } = await supabase
        .from('document_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesData) {
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
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
                <h1 className="text-xl font-bold text-gray-900">Secure Finance Portal</h1>
                <p className="text-sm text-gray-600">{client?.company_name || user?.email}</p>
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
        {client && (
          <div className="card mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welkom, {client.contact_person}
                </h2>
                <p className="text-gray-600">
                  Hier vind je een overzicht van alle documenten die je moet aanleveren.
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600">
                  {client.completeness_score}%
                </div>
                <p className="text-sm text-gray-600 mt-1">Volledigheid</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
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
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">In behandeling</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Ontbrekend</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Documenten Categorieën</h3>
          
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Er zijn nog geen categorieën aangemaakt.</p>
              <p className="text-sm text-gray-500 mt-2">
                Neem contact op met je boekhouder voor meer informatie.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                        <p className="text-sm text-gray-500">
                          {category.category_type === 'btw_quarter' && `Kwartaal ${category.quarter}`}
                          {category.category_type === 'annual_report' && 'Jaarrekening'}
                          {category.category_type === 'payroll' && 'Loonadministratie'}
                          {category.category_type === 'tax_return' && 'Belastingaangifte'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="btn-secondary text-sm">
                        <Upload className="w-4 h-4 mr-2 inline" />
                        Upload
                      </button>
                      <button className="btn-secondary text-sm">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
