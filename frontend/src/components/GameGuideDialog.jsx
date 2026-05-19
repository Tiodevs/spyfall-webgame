import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { GameGuide } from './GameGuide';

export const GameGuideDialog = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] gap-0 overflow-hidden border-white/10 bg-background p-0 sm:max-h-[90vh] sm:max-w-2xl">
      <DialogHeader className="sr-only">
        <DialogTitle>Guia do jogo Spyfall</DialogTitle>
        <DialogDescription>Regras, fluxo da partida e pontuação</DialogDescription>
      </DialogHeader>
      <div className="max-h-[85vh] overflow-y-auto px-4 pb-6 pt-2 sm:max-h-[80vh] sm:px-6 sm:pb-8 sm:pt-4">
        <GameGuide inModal onClose={() => onOpenChange(false)} />
      </div>
    </DialogContent>
  </Dialog>
);
