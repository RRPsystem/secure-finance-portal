import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Upload, CheckCircle, AlertCircle, Clock, FileText, Calendar, ChevronRight, Bell, X, Check, CalendarClock, Loader2, Shield } from 'lucide-react';
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
  
  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Uitstel modal state
  const [uitstelModalOpen, setUitstelModalOpen] = useState(false);
  const [uitstelRequest, setUitstelRequest] = useState<DocumentRequest | null>(null);
  const [uitstelSubmitting, setUitstelSubmitting] = useState(false);

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

  // Check if request is an "uitstel" type (based on title containing "uitstel" or "uitsle")
  function isUitstelRequest(request: DocumentRequest): boolean {
    const title = request.title.toLowerCase();
    return title.includes('uitstel') || title.includes('uitsle');
  }

  // Handle uitstel response (ja/nee)
  async function handleUitstelResponse(request: DocumentRequest, response: 'ja' | 'nee') {
    setUitstelSubmitting(true);
    try {
      // Update the request status and add response
      await supabase
        .from('document_requests')
        .update({ 
          status: 'completed',
          response: response === 'ja' ? 'Klant wil uitstel aanvragen' : 'Klant heeft geen uitstel nodig'
        })
        .eq('id', request.id);
      
      // Reload data
      await loadClientData();
      setUitstelModalOpen(false);
      setUitstelRequest(null);
    } catch (error) {
      console.error('Error submitting uitstel response:', error);
    } finally {
      setUitstelSubmitting(false);
    }
  }

  // Handle file upload
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || !event.target.files[0] || !selectedRequest || !client) return;
    
    const file = event.target.files[0];
    setUploadingFile(true);
    setUploadError(null);
    
    try {
      // Create secure file path: client_id/request_id/filename
      const filePath = `${client.id}/${selectedRequest.id}/${Date.now()}_${file.name}`;
      
      // Upload to Supabase Storage (secure bucket with RLS)
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (storageError) {
        console.error('Storage error:', storageError);
        throw new Error(`Upload mislukt: ${storageError.message}`);
      }
      
      // Create document record in database
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: client.id,
          request_id: selectedRequest.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
          status: 'pending'
        });
      
      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Database fout: ${dbError.message}`);
      }
      
      // Update request status
      const { error: updateError } = await supabase
        .from('document_requests')
        .update({ status: 'completed' })
        .eq('id', selectedRequest.id);
      
      if (updateError) {
        console.error('Update error:', updateError);
      }
      
      setUploadSuccess(true);
      
      // Reload data after short delay
      setTimeout(async () => {
        await loadClientData();
        setUploadModalOpen(false);
        setSelectedRequest(null);
        setUploadSuccess(false);
      }, 1500);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Er is iets misgegaan bij het uploaden.');
    } finally {
      setUploadingFile(false);
    }
  }

  function openUploadModal(request: DocumentRequest) {
    setSelectedRequest(request);
    setUploadModalOpen(true);
    setUploadError(null);
    setUploadSuccess(false);
  }

  function openUitstelModal(request: DocumentRequest) {
    setUitstelRequest(request);
    setUitstelModalOpen(true);
  }

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
                        {isUitstelRequest(request) ? (
                          <>
                            <button 
                              onClick={() => openUitstelModal(request)}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              <span>Ja, aanvragen</span>
                            </button>
                            <button 
                              onClick={() => handleUitstelResponse(request, 'nee')}
                              className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                              <span>Nee</span>
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => openUploadModal(request)}
                            className="flex items-center gap-2 bg-sf-taupe hover:bg-sf-brown text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Uploaden</span>
                          </button>
                        )}
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

      {/* Upload Modal */}
      {uploadModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Document uploaden</h3>
              <button 
                onClick={() => { setUploadModalOpen(false); setSelectedRequest(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-sf-cream rounded-lg mb-4">
                <FileText className="w-8 h-8 text-sf-taupe" />
                <div>
                  <p className="font-medium text-gray-900">{selectedRequest.title}</p>
                  {selectedRequest.deadline && (
                    <p className="text-sm text-gray-500">Deadline: {formatDeadline(selectedRequest.deadline)}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                <Shield className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700">
                  Je documenten worden veilig en versleuteld opgeslagen. Alleen jij en je boekhouder hebben toegang.
                </p>
              </div>
            </div>

            {uploadSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">Document geüpload!</p>
                <p className="text-sm text-gray-500">Je boekhouder ontvangt een melding.</p>
              </div>
            ) : (
              <>
                {uploadError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{uploadError}</p>
                  </div>
                )}
                
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-sf-taupe transition-colors cursor-pointer">
                    {uploadingFile ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-sf-taupe animate-spin mb-3" />
                        <p className="text-gray-600">Bezig met uploaden...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-1">Klik om een bestand te selecteren</p>
                        <p className="text-sm text-gray-400">of sleep het bestand hierheen</p>
                        <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG, Excel (max 10MB)</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                    disabled={uploadingFile}
                  />
                </label>
              </>
            )}
          </div>
        </div>
      )}

      {/* Uitstel Confirmation Modal */}
      {uitstelModalOpen && uitstelRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Uitstel aanvragen</h3>
              <button 
                onClick={() => { setUitstelModalOpen(false); setUitstelRequest(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-sf-cream rounded-lg mb-4">
                <CalendarClock className="w-8 h-8 text-sf-taupe" />
                <div>
                  <p className="font-medium text-gray-900">{uitstelRequest.title}</p>
                  {uitstelRequest.description && (
                    <p className="text-sm text-gray-500">{uitstelRequest.description}</p>
                  )}
                </div>
              </div>
              
              <p className="text-gray-600">
                Weet je zeker dat je uitstel wilt aanvragen? Je boekhouder zal dit voor je regelen.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleUitstelResponse(uitstelRequest, 'ja')}
                disabled={uitstelSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {uitstelSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Ja, aanvragen</span>
                  </>
                )}
              </button>
              <button
                onClick={() => { setUitstelModalOpen(false); setUitstelRequest(null); }}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>Annuleren</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
