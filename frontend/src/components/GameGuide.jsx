import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Eye,
  EyeOff,
  Users,
  MessageCircle,
  Timer,
  AlertTriangle,
  Target,
  Vote,
  Trophy,
  HelpCircle,
  Play,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Crown,
} from 'lucide-react';

const STEPS = [
  {
    icon: Users,
    title: 'Entre na sala',
    description: 'Crie uma sala ou use o código de 4 letras. São necessários pelo menos 3 jogadores. O host inicia a partida.',
  },
  {
    icon: Eye,
    title: 'Receba seu papel',
    description: 'Todos os agentes veem o mesmo local secreto. Um jogador é o espião e não vê o local.',
  },
  {
    icon: MessageCircle,
    title: 'Converse e investigue',
    description: 'Durante 6 minutos, façam perguntas e respostas em voz alta (ou no chat). Não há turnos fixos — o ritmo é livre.',
  },
  {
    icon: Target,
    title: 'Acuse ou chute',
    description: 'Agentes podem acusar suspeitos. O espião pode chutar o local a qualquer momento.',
  },
  {
    icon: Vote,
    title: 'Encerre a rodada',
    description: 'Se o tempo acabar, todos votam em quem acham que é o espião. O placar é atualizado e uma nova partida pode começar.',
  },
];

const SCORING = [
  { action: 'Espião acerta o local no chute', points: '+2', who: 'Espião' },
  { action: 'Espião erra o chute', points: '+1', who: 'Cada agente' },
  { action: 'Acusação correta (todos concordam)', points: '+2', who: 'Quem acusou' },
  { action: 'Acusação correta (todos concordam)', points: '+1', who: 'Agentes que votaram a favor' },
  { action: 'Acusação errada (inocente acusado)', points: '+2', who: 'Espião' },
  { action: 'Votação final — voto no espião', points: '+1', who: 'Quem acertou' },
];

const TIPS_AGENTS = [
  'Faça perguntas que só quem conhece o local responderia bem.',
  'Evite perguntas muito óbvias que revelem o local.',
  'Use a lista de locais na tela para riscar possibilidades.',
  'Observe quem hesita ou responde de forma genérica.',
];

const TIPS_SPY = [
  'Ouça com atenção antes de falar — as respostas revelam o local.',
  'Faça perguntas também, para não parecer suspeito.',
  'Só chute o local quando tiver uma boa ideia — errar dá pontos aos agentes.',
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

function RoleCard({ variant, title, subtitle, icon: Icon, children, accentClass }) {
  return (
    <Card className={`border-l-4 ${accentClass}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm ${variant === 'spy' ? 'bg-red-500/15' : 'bg-accent/15'}`}>
            <Icon className={`h-6 w-6 ${variant === 'spy' ? 'text-red-400' : 'text-accent'}`} />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted">{children}</CardContent>
    </Card>
  );
}

export const GameGuide = ({ onClose, inModal = false }) => {
  return (
    <div className={`space-y-8 ${inModal ? 'pb-2' : 'animate-fade-in pb-8'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground sm:text-4xl">
            Guia do <span className="text-accent">Jogo</span>
          </h1>
          <p className="mt-2 max-w-xl text-muted">
            Tudo o que você precisa saber para jogar Spyfall com seus amigos — regras, fluxo da partida e pontuação.
          </p>
        </div>
        <Badge className="w-fit gap-1.5 px-3 py-1.5 text-sm">
          <HelpCircle className="h-3.5 w-3.5" />
          3 a 20+ jogadores
        </Badge>
      </div>

      {/* O que é */}
      <section className="glass-panel space-y-3 p-5 sm:p-6">
        <SectionTitle icon={HelpCircle}>O que é Spyfall?</SectionTitle>
        <p className="text-sm leading-relaxed text-muted sm:text-base">
          Spyfall é um jogo de <strong className="text-foreground">dedução social</strong>. Todos os jogadores
          (exceto um) conhecem um <strong className="text-foreground">local secreto</strong> — por exemplo, um
          hospital ou um aeroporto. Um jogador é o <strong className="text-foreground">espião</strong> e não sabe
          onde estão. Pelo diálogo, os agentes tentam descobrir quem é o infiltrado; o espião tenta descobrir o
          local sem ser pego.
        </p>
      </section>

      {/* Papéis */}
      <section className="space-y-4">
        <SectionTitle icon={Users}>Os dois papéis</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <RoleCard
            variant="agent"
            title="Agente"
            subtitle="Você conhece o local"
            icon={Eye}
            accentClass="border-l-accent"
          >
            <p>Vê o nome e o ícone do local no topo da tela.</p>
            <p>Pode acusar outros jogadores de serem o espião.</p>
            <p>Pode riscar locais na lista para ajudar na dedução.</p>
            <p>Não pode entrar em uma sala com partida já em andamento.</p>
          </RoleCard>
          <RoleCard
            variant="spy"
            title="Espião"
            subtitle="Você não sabe o local"
            icon={EyeOff}
            accentClass="border-l-red-500"
          >
            <p>Não vê qual é o local — só a lista de possibilidades.</p>
            <p>Pode chutar o local a qualquer momento (com confirmação).</p>
            <p>Não vota em acusações — apenas observa e se defende.</p>
            <p>Se errar o chute, todos os agentes ganham pontos.</p>
          </RoleCard>
        </div>
      </section>

      {/* Fluxo */}
      <section className="space-y-4">
        <SectionTitle icon={Play}>Como funciona uma partida</SectionTitle>
        <p className="text-sm text-muted">
          Não há turnos numerados como em um tabuleiro. A partida é uma{' '}
          <strong className="text-foreground">conversa aberta</strong> com tempo limite. Veja o fluxo:
        </p>
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

      {/* Timer */}
      <section className="glass-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-accent/10">
          <Timer className="h-7 w-7 text-accent" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Timer de 6 minutos</h3>
          <p className="mt-1 text-sm text-muted">
            Quando a partida começa, um cronômetro aparece para todos. Ele fica amarelo nos últimos 2 minutos e
            vermelho no último minuto. Se o tempo acabar sem ninguém vencer antes, inicia-se a{' '}
            <strong className="text-foreground">votação final</strong>.
          </p>
        </div>
      </section>

      {/* Acusação */}
      <section className="space-y-4">
        <SectionTitle icon={AlertTriangle}>Sistema de acusação</SectionTitle>
        <Card>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <p className="text-sm text-muted">
              Qualquer <strong className="text-foreground">agente</strong> pode tocar em{' '}
              <strong className="text-foreground">Acusar</strong> ao lado do nome de um jogador. Isso inicia uma
              votação especial:
            </p>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex gap-3">
                <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                <span>
                  <strong className="text-foreground">Agentes</strong> (exceto o acusado) votam se concordam que
                  a pessoa é o espião.
                </span>
              </li>
              <li className="flex gap-3">
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>
                  O <strong className="text-foreground">espião</strong> e o <strong className="text-foreground">acusado</strong>{' '}
                  não votam — apenas aguardam.
                </span>
              </li>
              <li className="flex gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>
                  Se <strong className="text-foreground">todos os agentes concordarem</strong>, a partida termina:
                  acertando o espião, os agentes pontuam; se o acusado for inocente, o espião ganha pontos.
                </span>
              </li>
              <li className="flex gap-3">
                <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <span>
                  Se alguém discordar, a acusação é rejeitada e o jogo <strong className="text-foreground">continua</strong>.
                </span>
              </li>
            </ul>
            <p className="rounded-sm border border-white/10 bg-white/5 p-3 text-xs text-muted">
              Quem iniciou a acusação pode cancelá-la antes de todos votarem.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Chute espião */}
      <section className="space-y-4">
        <SectionTitle icon={MapPin}>Chute do espião</SectionTitle>
        <Card className="border-red-500/20">
          <CardContent className="p-5 sm:p-6">
            <p className="text-sm text-muted">
              O espião pode tocar em qualquer local da lista para{' '}
              <strong className="text-foreground">chutar</strong>. O jogo pede confirmação antes de registrar.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-sm border border-accent/30 bg-accent/10 p-4">
                <p className="font-semibold text-accent">Acertou o local</p>
                <p className="mt-1 text-sm text-muted">Espião ganha +2 pontos. Partida encerra.</p>
              </div>
              <div className="rounded-sm border border-red-500/30 bg-red-500/10 p-4">
                <p className="font-semibold text-red-400">Errou o local</p>
                <p className="mt-1 text-sm text-muted">Cada agente ganha +1 ponto. Partida encerra.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Votação final */}
      <section className="space-y-4">
        <SectionTitle icon={Vote}>Votação final</SectionTitle>
        <Card>
          <CardContent className="p-5 sm:p-6">
            <p className="text-sm text-muted">
              Quando o timer de 6 minutos chega a zero, cada jogador vota em quem acredita ser o espião. Após
              todos votarem, o jogo revela quem era o espião e quem pontuou. Depois disso, o host pode iniciar uma
              nova rodada na mesma sala — o placar acumula entre partidas.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Pontuação */}
      <section className="space-y-4">
        <SectionTitle icon={Trophy}>Tabela de pontuação</SectionTitle>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 font-semibold text-foreground">Situação</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Pontos</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Quem recebe</th>
                  </tr>
                </thead>
                <tbody>
                  {SCORING.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-muted">{row.action}</td>
                      <td className="px-4 py-3 font-bold text-accent">{row.points}</td>
                      <td className="px-4 py-3 text-muted">{row.who}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sala e host */}
      <section className="space-y-4">
        <SectionTitle icon={Crown}>Salas e host</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="glass-panel p-4">
            <p className="font-semibold text-foreground">Criar sala</p>
            <p className="mt-1 text-sm text-muted">
              Gera um código de 4 letras. O criador vira host e pode iniciar partidas com 3+ jogadores conectados.
            </p>
          </div>
          <div className="glass-panel p-4">
            <p className="font-semibold text-foreground">Entrar na sala</p>
            <p className="mt-1 text-sm text-muted">
              Use o código compartilhado. Não é possível entrar enquanto uma partida já está em andamento.
            </p>
          </div>
        </div>
      </section>

      {/* Dicas */}
      <section className="space-y-4">
        <SectionTitle icon={MessageCircle}>Dicas rápidas</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-accent">Para agentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-2 text-sm text-muted">
                {TIPS_AGENTS.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-400">Para o espião</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-2 text-sm text-muted">
                {TIPS_SPY.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <Button size="lg" onClick={onClose} className="gap-2">
          {inModal ? (
            'Fechar'
          ) : (
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
