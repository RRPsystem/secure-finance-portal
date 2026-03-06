import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Upload, CheckCircle, AlertCircle, Clock, FileText, Calendar, ChevronRight, Bell } from 'lucide-react';
import type { Client } from '../types/database.types';

interface DocumentRequest {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
}

function getDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'Geen deadline';
  const date = new Date(deadline);
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getUrgencyColor(daysLeft: number | null): string {
  if (daysLeft === null) return 'bg-gray-100 text-gray-600';
  if (daysLeft < 0) return 'bg-red-100 text-red-700';
  if (daysLeft <= 7) return 'bg-orange-100 text-orange-700';
  if (daysLeft <= 30) return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
}

export default function ClientDashboard() {
  const { user, signOut } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [user]);

  async function loadClientData() {
    if (!user) return;

    try {
      // Load client data
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientData) {
        setClient(clientData);

        // Load document requests for this client
        const { data: requestsData } = await supabase
          .from('document_requests')
          .select('*')
          .eq('client_id', clientData.id)
          .order('deadline', { ascending: true, nullsFirst: false });

        if (requestsData) {
          setDocumentRequests(requestsData);
        }
      }
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  }

  const pendingRequests = documentRequests.filter(r => r.status === 'pending' || r.status === 'sent');
  const completedRequests = documentRequests.filter(r => r.status === 'completed');
  
  // Find the nearest deadline
  const nearestDeadline = pendingRequests
    .filter(r => r.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sf-taupe"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sf-cream">
      <header className="bg-sf-taupe shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="/logo.png" 
                alt="Secure Finance" 
                className="h-10 w-auto"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <div className="hidden sm:block border-l border-white/30 pl-4">
                <p className="text-sm text-white/80">Klantportaal</p>
                <p className="text-white font-medium">{client?.company_name || user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Uitloggen</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome banner with deadline countdown */}
        {client && (
          <div className="bg-gradient-to-r from-sf-taupe to-sf-sand rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Welkom, {client.contact_person}
                </h2>
                <p className="text-white/80">
                  Je hebt <span className="font-bold text-white">{pendingRequests.length}</span> openstaande verzoeken van je boekhouder.
                </p>
              </div>
              
              {/* Deadline countdown */}
              {nearestDeadline && (
                <div className="bg-white/20 backdrop-blur rounded-xl px-6 py-4 text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm text-white/80">Eerstvolgende deadline</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatDeadline(nearestDeadline.deadline)}
                  </div>
                  {getDaysUntilDeadline(nearestDeadline.deadline) !== null && (
                    <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                      getDaysUntilDeadline(nearestDeadline.deadline)! < 0 
                        ? 'bg-red-500 text-white' 
                        : getDaysUntilDeadline(nearestDeadline.deadline)! <= 7 
                          ? 'bg-orange-400 text-white'
                          : 'bg-white/30 text-white'
                    }`}>
                      {getDaysUntilDeadline(nearestDeadline.deadline)! < 0 
                        ? `${Math.abs(getDaysUntilDeadline(nearestDeadline.deadline)!)} dagen te laat!`
                        : getDaysUntilDeadline(nearestDeadline.deadline) === 0
                          ? 'Vandaag!'
                          : `Nog ${getDaysUntilDeadline(nearestDeadline.deadline)} dagen`
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
                <p className="text-sm text-gray-600">Openstaand</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedRequests.length}</p>
                <p className="text-sm text-gray-600">Afgerond</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingRequests.filter(r => getDaysUntilDeadline(r.deadline) !== null && getDaysUntilDeadline(r.deadline)! < 0).length}
                </p>
                <p className="text-sm text-gray-600">Te laat</p>
              </div>
            </div>
          </div>
        </div>

        {/* Document Requests from Accountant */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Verzoeken van je boekhouder</h3>
          </div>
          
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Alles is up-to-date!</p>
              <p className="text-sm text-gray-500 mt-2">
                Je hebt geen openstaande verzoeken van je boekhouder.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => {
                const daysLeft = getDaysUntilDeadline(request.deadline);
                return (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-5 hover:border-sf-taupe hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getUrgencyColor(daysLeft)}`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{request.title}</h4>
                            {request.description && (
                              <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-gray-500">
                                Ontvangen: {new Date(request.created_at).toLocaleDateString('nl-NL')}
                              </span>
                              {request.deadline && (
                                <span className={`text-xs font-medium px-2 py-1 rounded ${getUrgencyColor(daysLeft)}`}>
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  Deadline: {formatDeadline(request.deadline)}
                                  {daysLeft !== null && (
                                    <span className="ml-1">
                                      ({daysLeft < 0 ? `${Math.abs(daysLeft)} dagen te laat` : daysLeft === 0 ? 'Vandaag!' : `nog ${daysLeft} dagen`})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 bg-sf-taupe hover:bg-sf-brown text-white px-4 py-2 rounded-lg transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>Uploaden</span>
                        </button>
                        <button className="flex items-center gap-2 border border-gray-300 hover:border-sf-taupe text-gray-700 px-4 py-2 rounded-lg transition-colors">
                          <ChevronRight className="w-4 h-4" />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed requests */}
        {completedRequests.length > 0 && (
          <div className="card mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Afgeronde verzoeken</h3>
            <div className="space-y-3">
              {completedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">{request.title}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDeadline(request.deadline)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
