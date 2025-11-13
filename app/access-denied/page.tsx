import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ShieldOff, UserX, Clock } from 'lucide-react'
import Link from 'next/link'

interface AccessDeniedPageProps {
  searchParams: {
    reason?: 'invalid_domain' | 'no_teacher_profile' | 'no_budget' | 'unauthorized'
  }
}

export default function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const reason = searchParams.reason || 'unauthorized'

  const messages = {
    invalid_domain: {
      icon: ShieldOff,
      title: 'Dominio Email Non Autorizzato',
      description:
        'Puoi accedere al sistema solo con un account Google Workspace del dominio @piaggia.it',
      details: 'Assicurati di utilizzare il tuo account istituzionale fornito dalla scuola.',
      contact: false,
    },
    no_teacher_profile: {
      icon: UserX,
      title: 'Profilo Docente Non Trovato',
      description:
        'Il tuo account non è stato ancora configurato nel sistema. Contatta l\'amministratore per abilitare l\'accesso.',
      details:
        'L\'amministratore deve prima caricare il tuo profilo e il budget delle ore prima che tu possa accedere.',
      contact: true,
    },
    no_budget: {
      icon: Clock,
      title: 'Budget Non Disponibile',
      description:
        'Il budget delle ore di recupero per l\'anno scolastico corrente non è ancora stato caricato.',
      details:
        'L\'accesso al sistema sarà abilitato non appena l\'amministratore caricherà il tuo budget annuale.',
      contact: true,
    },
    unauthorized: {
      icon: AlertCircle,
      title: 'Accesso Negato',
      description: 'Non hai i permessi necessari per accedere a questa risorsa.',
      details: 'Se ritieni che questo sia un errore, contatta l\'amministratore del sistema.',
      contact: true,
    },
  }

  const message = messages[reason]
  const Icon = message.icon

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Icon className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">{message.title}</CardTitle>
          <CardDescription className="mt-2 text-base">{message.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-sm text-gray-700">{message.details}</p>
          </div>

          {message.contact && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900">Contatta l&apos;amministratore</p>
              <p className="mt-1 text-sm text-blue-700">
                Email:{' '}
                <a
                  href="mailto:admin@piaggia.it"
                  className="font-medium underline hover:text-blue-900"
                >
                  admin@piaggia.it
                </a>
              </p>
            </div>
          )}

          {reason === 'invalid_domain' && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-900">Account Sbagliato?</p>
              <p className="mt-1 text-sm text-yellow-700">
                Assicurati di aver effettuato il logout da altri account Google prima di riprovare.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/login">Torna al Login</Link>
          </Button>
          {reason === 'invalid_domain' && (
            <Button asChild variant="outline" className="w-full">
              <a
                href="https://accounts.google.com/logout"
                target="_blank"
                rel="noopener noreferrer"
              >
                Logout da Google
              </a>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
