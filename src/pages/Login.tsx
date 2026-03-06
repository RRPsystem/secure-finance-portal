import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      const errorMessage = err.message || '';
      console.error('Login error:', err);
      setError(errorMessage || 'Inloggen mislukt. Controleer je gegevens.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sf-light relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sf-light via-sf-beige to-sf-sand"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-sf-taupe/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sf-taupe/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <img 
              src="/logo.png" 
              alt="Secure Finance" 
              className="h-24 w-auto brightness-0 invert"
            />
          </div>
          
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-sf-black leading-tight">
              Jouw partner in<br />
              <span className="text-sf-brown">financiële zaken</span>
            </h1>
            <p className="text-sf-gray text-lg max-w-md">
              Welkom bij het klantportaal van Secure Finance. 
              Beheer je documenten, communiceer met je boekhouder en houd overzicht.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-sf-brown">
              <div className="w-10 h-10 rounded-full bg-sf-taupe/30 flex items-center justify-center">
                <span className="text-sf-brown font-semibold">✓</span>
              </div>
              <span>Veilig documenten uploaden</span>
            </div>
            <div className="flex items-center space-x-3 text-sf-brown">
              <div className="w-10 h-10 rounded-full bg-sf-taupe/30 flex items-center justify-center">
                <span className="text-sf-brown font-semibold">✓</span>
              </div>
              <span>Direct contact met je boekhouder</span>
            </div>
            <div className="flex items-center space-x-3 text-sf-brown">
              <div className="w-10 h-10 rounded-full bg-sf-taupe/30 flex items-center justify-center">
                <span className="text-sf-brown font-semibold">✓</span>
              </div>
              <span>Altijd inzicht in je administratie</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Secure Finance" 
              className="h-12 w-auto mx-auto"
            />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-sf-black">Welkom terug</h2>
            <p className="text-sf-brown mt-2">Log in op je klantportaal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mailadres
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-12"
                  placeholder="jouw@email.nl"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-12"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sf-taupe hover:bg-sf-taupe-dark text-white font-semibold py-3.5 px-5 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span>{loading ? 'Inloggen...' : 'Inloggen'}</span>
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-sf-gray">Problemen met inloggen?</p>
            <a 
              href="mailto:info@securefinance.nl" 
              className="text-sf-brown hover:text-sf-taupe font-medium text-sm transition-colors"
            >
              Neem contact op met Secure Finance
            </a>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-center text-xs text-gray-400">
              © {new Date().getFullYear()} Secure Finance. Alle rechten voorbehouden.
            </p>
            <p className="text-center text-xs text-gray-400 mt-1">
              Administratiekantoor in Uden
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
