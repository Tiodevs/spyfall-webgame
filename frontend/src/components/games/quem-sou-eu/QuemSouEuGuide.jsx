import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  HelpCircle,
  Users,
  MessageCircle,
  Timer,
  Trophy,
  Play,
  ThumbsUp,
  ThumbsDown,
  UserRound,
  Crown,
} from 'lucide-react';

const STEPS = [
  {
    icon: Users,
    title: 'Cada um recebe uma identidade',
    description: 'O app cola um famoso, personagem ou animal na sua “testa”. Você não vê o seu — só o dos outros.',
  },
  {
    icon: MessageCircle,
    title: 'Pergunte sim ou não',
    description: 'Na sua vez, pergunte em voz alta (“Eu sou cantor?”, “Estou vivo?”). Os outros respondem no celular.',
  },
  {
    icon: ThumbsUp,
    title: 'Sim continua, não passa',
    description: 'Se a resposta for sim, você pergunta de novo. Se for não, a vez vai para o próximo.',
  },
  {
    icon: UserRound,
    title: 'Adivinhe quem você é',
    description: 'Quando tiver uma boa hipótese, chute na sua vez. Acertou: você pontua e sai da rodada de perguntas.',
  },
  {
    icon: Trophy,
    title: 'Quem descobre primeiro ganha mais',
    description: 'O primeiro leva 3 pontos, o segundo 2, os demais 1. A partida acaba quando todos descobrem ou o tempo acaba.',
  },
];

const SCORING = [
  { action: 'Primeiro a descobrir', points: '+3' },
  { action: 'Segundo a descobrir', points: '+2' },
  { action: 'Demais que acertarem', points: '+1' },
  { action: 'Não descobriu até o fim', points: '0' },
];

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="font-display flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
      <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-accent/30 bg-accent/10">
        <Icon className="h-4 w-4 text-accent" />
      </span>
      {children}
    </h2>
  );
}

export const QuemSouEuGuide = ({ onClose, inModal = false }) => {
  return (
    <div className={`space-y-8 ${inModal ? 'pb-2' : 'animate-fade-in pb-8'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground sm:text-4xl">
            Quem <span className="text-accent">sou eu?</span>
          </h1>
          <p className="mt-2 max-w-xl text-muted">
            O clássico do post-it na testa, agora com turnos e placar no celular.
          </p>
        </div>
        <Badge className="w-fit gap-1.5 px-3 py-1.5 text-sm">
          <HelpCircle className="h-3.5 w-3.5" />
          2 ou mais jogadores
        </Badge>
      </div>

      <section className="glass-panel space-y-3 p-5 sm:p-6">
        <SectionTitle icon={HelpCircle}>Como se joga</SectionTitle>
        <p className="text-sm leading-relaxed text-muted sm:text-base">
          Todo mundo vê a identidade dos outros e <strong className="text-foreground">ninguém vê a própria</strong>.
          Façam perguntas de sim ou não em voz alta. O app só organiza a vez, registra as respostas e o chute final.
        </p>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={Play}>Fluxo da partida</SectionTitle>
        <div className="relative space-y-0">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === STEPS.length - 1;
            return (
              <div key={step.title} className="relative flex gap-4 pb-8">
                {!isLast && (
                  <div className="absolute left-[17px] top-10 h-[calc(100%-8px)] w-px bg-white/10" />
                )}
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-accent/40 bg-accent/10 text-sm font-bold text-accent">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <h3 className="font-display font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-accent/10">
          <Timer className="h-7 w-7 text-accent" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Timer opcional</h3>
          <p className="mt-1 text-sm text-muted">
            O host escolhe 8, 10 ou 12 minutos — ou deixa livre. Se o tempo acabar, as identidades são reveladas e
            só quem já tinha acertado pontua.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={ThumbsDown}>Respostas</SectionTitle>
        <Card>
          <CardContent className="space-y-3 p-5 text-sm text-muted sm:p-6">
            <p>
              Quem <strong className="text-foreground">não está na vez</strong> vê a identidade de quem pergunta e
              toca em Sim ou Não. O primeiro toque vale — vocês estão juntos, então combinem a resposta em voz alta.
            </p>
            <p>
              Quem pergunta também pode <strong className="text-foreground">passar a vez</strong> sem chutar.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={Trophy}>Pontuação</SectionTitle>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 font-semibold text-foreground">Situação</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {SCORING.map((row) => (
                    <tr key={row.action} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-muted">{row.action}</td>
                      <td className="px-4 py-3 font-bold text-accent">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={Crown}>Dica</SectionTitle>
        <div className="glass-panel p-4 text-sm text-muted">
          Comece pelo amplo (“sou pessoa?”, “sou fictício?”) e vá afinando. Errou o chute? A vez passa — não vale
          insistir no mesmo palpite.
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <Button size="lg" onClick={onClose} className="gap-2">
          {inModal ? 'Fechar' : (
            <>
              <Play className="h-4 w-4" />
              Entendi — quero jogar!
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
