import { useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import NotificationBell from './NotificationBell';
import { KenteBand, SunDisc } from './Motifs';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';
import { Users, Wallet, ArrowRightLeft, CreditCard, Calendar, BarChart3, LayoutDashboard, LogOut, Menu, ChevronDown, CircleDot, Banknote, User, Settings, ScrollText } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const reservesAuxResponsables = ['distributions', 'reports'];

const navItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'members', label: 'Membres', icon: Users },
  { id: 'caisse', label: 'Caisses', icon: Wallet },
  { id: 'mouvements', label: 'Mouvements', icon: ArrowRightLeft },
  { id: 'loans', label: 'Prêts', icon: CreditCard },
  { id: 'meetings', label: 'Réunions', icon: Calendar },
  { id: 'tontine', label: 'Tontine', icon: CircleDot },
  { id: 'distributions', label: 'Distributions', icon: Banknote },
  { id: 'myspace', label: 'Mon espace', icon: User },
  { id: 'reports', label: 'Rapports', icon: BarChart3 },
  { id: 'statuts', label: 'Statuts', icon: ScrollText },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { currentUser, logout } = useApp();
  useDialogAccessibility();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const roleLabels: Record<string, string> = {
    admin: 'Administratrice',
    presidente: 'Présidente',
    secretaire: 'Secrétaire Générale',
    tresoriere: 'Trésorière',
    commissaire: 'Commissaire aux Comptes',
    animatrice: 'Animatrice',
    conseillere: 'Conseillère',
    membre: 'Membre'
  };

  return (
    <div className="min-h-screen bg-creme flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-encre text-creme overflow-hidden transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <SunDisc className="-top-16 -right-16 w-52 h-52" />
        <KenteBand height={12} />
        <div className="relative p-6 pb-5">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-safran rounded-full flex items-center justify-center">
                <span className="text-encre font-bold text-2xl" style={{ fontFamily: 'var(--font-display)' }}>A</span>
              </div>
              <h1 className="text-2xl font-bold leading-tight">AFMEY</h1>
            </div>
            <p className="text-xs text-sable">Filles & Femmes Mebounou M'Eyinga</p>
          </div>
        </div>

        <nav className="relative flex-1 px-4 pb-4 space-y-1 overflow-y-auto">
          {navItems.filter(item => !(currentUser?.role === 'membre' && reservesAuxResponsables.includes(item.id))).map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 min-h-11 rounded-xl text-sm font-medium transition-all ${
                currentPage === item.id ? 'bg-safran text-encre font-bold' : 'text-sable hover:bg-white/10 hover:text-creme'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="relative p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 bg-safran rounded-full flex items-center justify-center">
              <span className="text-encre font-bold text-sm">
                {currentUser?.prenom?.[0]}{currentUser?.nom?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser?.prenom} {currentUser?.nom}</p>
              <p className="text-xs text-sable">{roleLabels[currentUser?.role || '']}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-creme/95 backdrop-blur border-b border-sable px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu size={24} />
            </button>
            <h2 className="text-2xl font-bold text-encre">
              {navItems.find(n => n.id === currentPage)?.label || 'Tableau de bord'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
          <NotificationBell onNavigate={onNavigate} />
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <div className="w-9 h-9 bg-encre rounded-full flex items-center justify-center">
                <span className="text-safran font-bold text-xs">{currentUser?.prenom?.[0]}{currentUser?.nom?.[0]}</span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{currentUser?.prenom}</span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium">{currentUser?.prenom} {currentUser?.nom}</p>
                  <p className="text-xs text-gray-500">{currentUser?.telephone}</p>
                </div>
                <button onClick={() => { onNavigate('myspace'); setProfileOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <User size={16} /> Mon espace
                </button>
                <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                  <LogOut size={16} /> Déconnexion
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div key={currentPage} className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
