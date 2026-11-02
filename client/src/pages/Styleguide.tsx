import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Le classi sono scritte per intero perché Tailwind le trovi nel sorgente.
const colorTokens = [
  { token: "background", swatch: "bg-background" },
  { token: "foreground", swatch: "bg-foreground" },
  { token: "card", swatch: "bg-card" },
  { token: "card-foreground", swatch: "bg-card-foreground" },
  { token: "popover", swatch: "bg-popover" },
  { token: "popover-foreground", swatch: "bg-popover-foreground" },
  { token: "primary", swatch: "bg-primary" },
  { token: "primary-foreground", swatch: "bg-primary-foreground" },
  { token: "secondary", swatch: "bg-secondary" },
  { token: "secondary-foreground", swatch: "bg-secondary-foreground" },
  { token: "muted", swatch: "bg-muted" },
  { token: "muted-foreground", swatch: "bg-muted-foreground" },
  { token: "accent", swatch: "bg-accent" },
  { token: "accent-foreground", swatch: "bg-accent-foreground" },
  { token: "destructive", swatch: "bg-destructive" },
  { token: "destructive-foreground", swatch: "bg-destructive-foreground" },
  { token: "income", swatch: "bg-income" },
  { token: "income-foreground", swatch: "bg-income-foreground" },
  { token: "expense", swatch: "bg-expense" },
  { token: "expense-foreground", swatch: "bg-expense-foreground" },
  { token: "border", swatch: "bg-border" },
  { token: "input", swatch: "bg-input" },
  { token: "ring", swatch: "bg-ring" },
] as const

const typeScale = [
  { name: "text-4xl", className: "text-4xl font-semibold tracking-tight" },
  { name: "text-3xl", className: "text-3xl font-semibold tracking-tight" },
  { name: "text-2xl", className: "text-2xl font-semibold" },
  { name: "text-xl", className: "text-xl font-semibold" },
  { name: "text-lg", className: "text-lg font-medium" },
  { name: "text-base", className: "text-base" },
  { name: "text-sm", className: "text-sm" },
  { name: "text-xs", className: "text-xs" },
] as const

const buttonVariants = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "link",
  "destructive",
  "income",
  "expense",
] as const

const buttonSizes = ["xs", "sm", "default", "lg"] as const
const iconSizes = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" })

// Gli importi arrivano sempre in centesimi.
function formatCents(cents: number) {
  return euro.format(cents / 100)
}

// Legge il valore dal CSS: i colori sono definiti solo in index.css.
function readCssVariable(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
}

function ColorSwatch({ token, swatch }: { token: string; swatch: string }) {
  const value = readCssVariable(token)
  return (
    <div className="flex items-center gap-3">
      <div className={`size-12 shrink-0 rounded-lg ring-1 ring-border ${swatch}`} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{token}</p>
        <p className="text-xs text-muted-foreground uppercase tabular-nums">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default function Styleguide() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Styleguide</h1>
        <p className="text-muted-foreground">Token, tipografia e componenti di Coppr.</p>
      </header>

      <Section title="Colori">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {colorTokens.map((color) => (
            <ColorSwatch key={color.token} token={color.token} swatch={color.swatch} />
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="flex flex-col gap-3">
          {typeScale.map((step) => (
            <div key={step.name} className="flex items-baseline gap-4">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{step.name}</span>
              <span className={step.className}>Quanto ho speso</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Importi (tabular-nums)</h3>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatCents(124350)}</p>
          <p className="text-lg text-income tabular-nums">+ {formatCents(145000)}</p>
          <p className="text-lg text-expense tabular-nums">− {formatCents(3840)}</p>
        </div>
      </Section>

      <Section title="Button">
        {buttonVariants.map((variant) => (
          <div key={variant} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{variant}</h3>
            <div className="flex flex-wrap items-center gap-2">
              {buttonSizes.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {size}
                </Button>
              ))}
              {iconSizes.map((size) => (
                <Button key={size} variant={variant} size={size} aria-label={size}>
                  <Plus />
                </Button>
              ))}
              <Button variant={variant} disabled>
                disabled
              </Button>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Card">
        <Card>
          <CardHeader>
            <CardTitle>Saldo di novembre</CardTitle>
            <CardDescription>Entrate e uscite del mese</CardDescription>
            <CardAction>
              <Button variant="ghost" size="icon-sm" aria-label="Elimina">
                <Trash2 />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span>Stipendio</span>
              <span className="text-income tabular-nums">+ {formatCents(145000)}</span>
            </div>
            <div className="flex justify-between">
              <span>Spesa al supermercato</span>
              <span className="text-expense tabular-nums">− {formatCents(3840)}</span>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="income">
              <Plus data-icon="inline-start" />
              Entrata
            </Button>
            <Button variant="expense">
              <Minus data-icon="inline-start" />
              Uscita
            </Button>
          </CardFooter>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Card sm</CardTitle>
            <CardDescription>Variante compatta</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatCents(98710)}</p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Input e Label">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sg-default">Descrizione</Label>
          <Input id="sg-default" placeholder="Spesa al supermercato" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sg-amount">Importo</Label>
          <Input id="sg-amount" inputMode="decimal" placeholder="0,00" className="tabular-nums" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sg-invalid">Non valido</Label>
          <Input id="sg-invalid" aria-invalid defaultValue="abc" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sg-disabled">Disabilitato</Label>
          <Input id="sg-disabled" disabled placeholder="Non modificabile" />
        </div>
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Apri dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminare la transazione?</DialogTitle>
              <DialogDescription>L'operazione non si può annullare.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Annulla</DialogClose>
              <Button variant="destructive">Elimina</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>
    </main>
  )
}
