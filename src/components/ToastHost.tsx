import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ecouterMessages, Message } from '../lib/notifier';

const styles = {
  success: { fond: 'bg-green-50 border-green-300 text-green-900', Icone: CheckCircle2, couleur: 'text-green-700' },
  error: { fond: 'bg-red-50 border-red-300 text-red-900', Icone: AlertCircle, couleur: 'text-red-700' },
  info: { fond: 'bg-safran/20 border-safran text-encre', Icone: Info, couleur: 'text-terre' },
} as const;

export default function ToastHost() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => ecouterMessages(m => {
    setMessages(prev => [...prev.slice(-3), m]);
    if (!m.persistant) {
      const duree = m.type === 'error' ? 9000 : 6000;
      setTimeout(() => setMessages(prev => prev.filter(x => x.id !== m.id)), duree);
    }
  }), []);

  const fermer = (id: number) => setMessages(prev => prev.filter(m => m.id !== id));

  return (
    <div className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {messages.map(m => {
        const { fond, Icone, couleur } = styles[m.type];
        return (
          <div key={m.id} role={m.type === 'error' ? 'alert' : 'status'} className={`toast-entree pointer-events-auto flex gap-3 items-start border-2 rounded-2xl p-4 shadow-xl ${fond}`}>
            <Icone size={20} className={`shrink-0 mt-0.5 ${couleur}`} />
            <p className="flex-1 text-sm whitespace-pre-line break-words">{m.texte}</p>
            <button onClick={() => fermer(m.id)} aria-label="Fermer le message" className="shrink-0 p-1 -m-1 rounded-lg hover:bg-black/10"><X size={16} /></button>
          </div>
        );
      })}
    </div>
  );
}
