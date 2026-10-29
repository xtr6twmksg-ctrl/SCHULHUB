import { CalendarDays, Database, Info, LogOut, Share, Star, Trash2 } from 'lucide-react'
import { postJSON } from '../lib/api'
import { useApp } from '../lib/app'
import { useFavoriteStops } from '../lib/storage'
import { UntisLogin } from '../components/untis'
import { Button, Card, PageHeader } from '../components/ui'

export function More() {
  const { config, reloadConfig } = useApp()
  const { stops, toggle } = useFavoriteStops()

  const logout = async () => {
    await postJSON('/api/untis/logout', {}).catch(() => undefined)
    await reloadConfig()
  }

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="SCHULHUB BS" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="WebUntis" icon={CalendarDays}>
          {config?.untis.loggedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-ink">
                Verbunden{config.untis.school ? ` mit „${config.untis.school}“` : ''}. Mit „Abmelden“ werden auch gespeicherte Zugangsdaten von diesem Gerät gelöscht.
              </p>
              <Button variant="secondary" icon={LogOut} onClick={logout}>
                Abmelden
              </Button>
            </div>
          ) : (
            <UntisLogin />
          )}
        </Card>

        <Card title="Lieblings-Haltestellen" icon={Star} delay={60}>
          {stops.length === 0 ? (
            <p className="text-sm text-muted">Noch keine Favoriten. Tippe im Fahrplan auf den Stern.</p>
          ) : (
            <ul className="space-y-1">
              {stops.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/55 py-1 pr-1 pl-3 text-sm">
                  <span>
                    {s.name}
                    {i === 0 && <span className="ml-2 text-xs text-muted">(Startseite)</span>}
                  </span>
                  <button onClick={() => toggle(s)} className="grid size-10 place-items-center rounded-full text-red-700 hover:bg-red-50" aria-label={`${s.name} entfernen`}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Als App installieren" icon={Share} delay={120}>
          <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">
            <li>Seite in <strong>Safari</strong> öffnen.</li>
            <li>Auf das Teilen-Symbol tippen.</li>
            <li>„Zum Home-Bildschirm“ wählen.</li>
          </ol>
        </Card>

        <Card title="Datenschutz" icon={Database} delay={180}>
          <ul className="space-y-2 text-sm leading-relaxed">
            <li>Kein Benutzerkonto, keine Werbung, kein Tracking, keine Cookies außer der WebUntis-Anmeldung.</li>
            <li>Dein WebUntis-Passwort wird nur an WebUntis weitergeleitet. Auf dem Server wird nichts gespeichert.</li>
            <li>
              Auf diesem Gerät liegt ein verschlüsseltes Cookie: ohne „Angemeldet bleiben“ max. 8 Stunden nur mit der Sitzung, mit
              „Angemeldet bleiben“ max. 90 Tage inkl. verschlüsselter Zugangsdaten. Dazu deine Favoriten.
            </li>
            <li>Haltestellen-Anfragen gehen ohne persönliche Daten an Transitous.</li>
          </ul>
        </Card>

        <Card title="Über" icon={Info} delay={240} className="md:col-span-2">
          <p className="text-sm leading-relaxed text-muted">
            SCHULHUB BS ist ein inoffizielles Schülerprojekt und steht in keiner Verbindung zur Sally-Perel-Gesamtschule, zu
            Untis, IServ oder der BSVG. Fahrplandaten:{' '}
            <a className="underline" href="https://transitous.org/sources/" target="_blank" rel="noopener noreferrer">
              Transitous und Datenquellen
            </a>
            . Version 0.1.0
          </p>
        </Card>
      </div>
    </>
  )
}
