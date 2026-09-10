import { useEffect, useState } from 'react';
import { Settings, Clock, Eye, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import {
  LOCATION_PACKS,
  TIMER_OPTIONS,
  MIN_PLAYERS_FOR_TWO_SPIES,
  DEFAULT_ROOM_SETTINGS
} from '@shared/gameData';

export const RoomSettings = ({ socket, roomCode, isHost, settings, connectedCount }) => {
  const [localSettings, setLocalSettings] = useState(settings || { ...DEFAULT_ROOM_SETTINGS });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const emitSettings = (next) => {
    setLocalSettings(next);
    if (socket && roomCode && isHost) {
      socket.emit('update-room-settings', { roomCode, settings: next });
    }
  };

  const handleTimerChange = (minutes) => {
    emitSettings({ ...localSettings, timerMinutes: minutes });
  };

  const handleSpyCountChange = (count) => {
    if (count === 2 && connectedCount < MIN_PLAYERS_FOR_TWO_SPIES) return;
    emitSettings({ ...localSettings, spyCount: count });
  };

  const handlePackChange = (packId) => {
    emitSettings({ ...localSettings, locationPack: packId });
  };

  const timerLabel = `${localSettings.timerMinutes} min`;
  const spyLabel = localSettings.spyCount === 2 ? '2 espiões' : '1 espião';
  const packLabel = LOCATION_PACKS.find(p => p.id === localSettings.locationPack)?.label || 'Padrão';

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
            <Eye className="h-3 w-3" />
            {spyLabel}
          </Badge>
          <Badge variant="outline" className="gap-1 border-white/10">
            <MapPin className="h-3 w-3" />
            {packLabel}
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
          <div className="flex gap-2">
            {TIMER_OPTIONS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => handleTimerChange(min)}
                className={`flex-1 rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
                  localSettings.timerMinutes === min
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-white/10 bg-white/5 text-foreground hover:bg-white/10'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted">
            <Eye className="h-3.5 w-3.5" />
            Espiões
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSpyCountChange(1)}
              className={`flex-1 rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
                localSettings.spyCount === 1
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-white/10 bg-white/5 text-foreground hover:bg-white/10'
              }`}
            >
              1 espião
            </button>
            <button
              type="button"
              onClick={() => handleSpyCountChange(2)}
              disabled={connectedCount < MIN_PLAYERS_FOR_TWO_SPIES}
              className={`flex-1 rounded-sm border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                localSettings.spyCount === 2
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-white/10 bg-white/5 text-foreground hover:bg-white/10'
              }`}
            >
              2 espiões
            </button>
          </div>
          {connectedCount < MIN_PLAYERS_FOR_TWO_SPIES && (
            <p className="text-xs text-muted">
              2 espiões disponível com {MIN_PLAYERS_FOR_TWO_SPIES}+ jogadores conectados.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted">
            <MapPin className="h-3.5 w-3.5" />
            Deck de locais
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {LOCATION_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => handlePackChange(pack.id)}
                className={`rounded-sm border p-3 text-left transition-colors ${
                  localSettings.locationPack === pack.id
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
