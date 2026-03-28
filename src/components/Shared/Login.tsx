import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Lock, Mail, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      console.error(err);
      setError('Credenciales inválidas. Por favor, comprueba tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-200/10 rounded-full blur-3xl" />
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative animate-fade-in-up">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-900/5 p-8 border border-white/80">
          {/* Logo area */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-5 animate-scale-in">
              <img
                src="/logos/serasan-logo.png"
                alt="SERASAN Engineering"
                className="h-20 object-contain drop-shadow-sm"
              />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Lead Manager</h1>
            <p className="text-gray-400 text-sm mt-1 font-medium">Acceso Restringido</p>
            <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-50/80 rounded-full border border-emerald-100">
              <img src="/logos/reactiva-icon.png" alt="Reactiva tu Edificio" className="w-5 h-5 object-contain" />
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Reactiva tu Edificio</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Email</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50/80 border-2 border-gray-200/80 rounded-2xl pl-12 pr-4 py-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all duration-200"
                  placeholder="admin@serasan.es"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Contraseña</label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-50/80 border-2 border-gray-200/80 rounded-2xl pl-12 pr-4 py-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all duration-200"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-start space-x-3 text-sm animate-fade-in-up border border-red-100">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 hover:from-gray-800 hover:via-gray-700 hover:to-gray-800 text-white py-4 rounded-2xl font-bold shadow-lg shadow-gray-900/10 transition-all duration-200 flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 group"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Entrar al Panel</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400 relative font-medium">
        © {new Date().getFullYear()} SERASAN Investment SL. Todos los derechos reservados.
      </p>
    </div>
  );
}
