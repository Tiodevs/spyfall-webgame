import { useEffect, useState } from 'react';
import { Settings, Clock, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Label } from '../../ui/label';
import {
  IDENTITY_PACKS,
  TIMER_OPTIONS,
  DEFAULT_ROOM_SETTINGS
} from '@shared/quemSouEu';

export const QuemSouEuSettings = ({ socket, roomCode, isHost, settings, connectedCount }) => {
  const [localSettings, setLocalSettings] = useState(settings || { ...DEFAULT_ROOM_SETTINGS });

  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...DEFAULT_ROOM_SETTINGS, ...settings });
    }
  }, [settings]);

  const emitSettings = (next) => {
    setLocalSettings(next);
    if (socket && roomCode && isHost) {
      socket.emit('update-room-settings', { roomCode, settings: next });
    }
  };

  const timerLabel = localSettings.timerMinutes === 0 ? 'Sem limite' : `${localSettings.timerMinutes} min`;
  const packLabel = IDENTITY_PACKS.find(p => p.id === localSettings.identityPack)?.label || 'Famosos';

  if (!isHost) {
    return (
      <Card className="border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Settings className="h-4 w-4 text-accent" />
            Configurações da sala
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 border-white/10">
            <Clock className="h-3 w-3" />
            {timerLabel}
          </Badge>
          <Badge variant="outline" className="gap-1 border-white/10">
            <UserRound className="h-3 w-3" />
            {packLabel}
          </Badge>
          <Badge variant="outline" className="gap-1 border-white/10">
            {connectedCount} jogador{connectedCount !== 1 ? 'es' : ''}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Settings className="h-4 w-4 text-accent" />
          Configurações da partida
        </CardTitle>
        <p className="text-xs text-muted">Ajuste antes de iniciar — todos na sala verão as opções.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted">
            <Clock className="h-3.5 w-3.5" />
            Duração
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIMER_OPTIONS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => emitSettings({ ...localSettings, timerMinutes: min })}
                className={`rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
                  localSettings.timerMinutes === min
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-white/10 bg-white/5 text-foreground hover:bg-white/10'
                }`}
              >
                {min === 0 ? 'Livre' : `${min} min`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted">
            <UserRound className="h-3.5 w-3.5" />
            Deck de identidades
          </Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {IDENTITY_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => emitSettings({ ...localSettings, identityPack: pack.id })}
                className={`rounded-sm border p-3 text-left transition-colors ${
                  localSettings.identityPack === pack.id
                    ? 'border-accent/50 bg-accent/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="block text-sm font-semibold text-foreground">{pack.label}</span>
                <span className="mt-1 block text-xs text-muted">{pack.description}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
