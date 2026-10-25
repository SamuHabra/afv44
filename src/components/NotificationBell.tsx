import { useCallback, useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useApp } from '../context/AppContextSupabase';
import { NotificationApp } from '../types';

const INTERVALLE_MS = 60_000;

export default function NotificationBell({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { getNotifications, marquerNotificationLue, marquerToutesNotificationsLues, currentUser } = useApp();
  const [notifications, setNotifications] = useState<NotificationApp[]>([]);
  const [ouvert, setOuvert] = useState(false);

  const charger = useCallback(async () => {
    setNotifications(await getNotifications());
  }, [getNotifications]);

  useEffect(() => {
    if (!currentUser) return;
    charger();
    const timer = setInterval(charger, INTERVALLE_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const nonLues = notifications.filter(n => !n.lu).length;

  const ouvrirNotification = async (n: NotificationApp) => {
    if (!n.lu) {
      await marquerNotificationLue(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, lu: true } : x));
    }
    setOuvert(false);
    if (n.page) onNavigate(n.page);
    else if (n.reunionId) onNavigate('meetings');
  };

  const toutLire = async () => {
    await marquerToutesNotificationsLues();
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
  };

  return (
    <div className="relative">
      <button onClick={() => { setOuvert(!ouvert); if (!ouvert) charger(); }} className="relative p-2 rounded-lg hover:bg-gray-100 transition" aria-label="Notifications">
        <Bell size={20} className="text-gray-600" />
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{nonLues > 9 ? '9+' : nonLues}</span>
        )}
      </button>
      {ouvert && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOuvert(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-lg border border-gray-100 z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Notifications</p>
              {nonLues > 0 && <button onClick={toutLire} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"><Check size={12} /> Tout marquer comme lu</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 text-center">Aucune notification</p>}
              {notifications.slice(0, 30).map(n => (
                <button key={n.id} onClick={() => ouvrirNotification(n)} className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${n.lu ? '' : 'bg-indigo-50/50'}`}>
                  <div className="flex items-start gap-2">
                    {!n.lu && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{n.titre}</p>
                      <p className="text-xs text-gray-600 break-words">{n.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{new Date(n.date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
