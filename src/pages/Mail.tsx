import { ExternalLink, Mail as MailIcon, ShieldCheck, Smartphone } from 'lucide-react'
import { useApp } from '../lib/app'
import { Button, Card, Notice, PageHeader } from '../components/ui'

export function Mail() {
  const { config } = useApp()
  const url = config?.iserv.url ?? 'https://sp-gs.de'
  const host = new URL(url).host
  return (
    <>
      <PageHeader title="E-Mail" subtitle="IServ" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Posteingang" icon={MailIcon} className="md:col-span-2">
          <Notice title="IServ ist noch nicht angebunden">
            Für das Abrufen von IServ-E-Mails durch fremde Apps gibt es keine öffentlich freigegebene Schnittstelle. Damit deine
            Zugangsdaten sicher bleiben, liest SCHULHUB BS deine E-Mails nicht aus und zeigt hier keine Anzahl ungelesener
            Nachrichten an.
          </Notice>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={url} icon={ExternalLink}>
              {host} öffnen
            </Button>
          </div>
        </Card>

        <Card title="Tipp fürs iPhone" icon={Smartphone} delay={60}>
          <ul className="space-y-2 text-sm leading-relaxed text-ink">
            <li>
              <strong>IServ-App:</strong> Die offizielle IServ-App aus dem App Store zeigt dir E-Mails mit Mitteilungen an.
            </li>
            <li>
              <strong>Apple Mail:</strong> Viele IServ-Server erlauben den Abruf per IMAP. Ob das bei deiner Schule aktiviert ist
              und welche Serveradresse gilt, steht in IServ unter <em>E-Mail → Einstellungen</em> oder in der IServ-Hilfe deiner
              Schule.
            </li>
          </ul>
        </Card>

        <Card title="Warum keine Anbindung?" icon={ShieldCheck} delay={120}>
          <p className="text-sm leading-relaxed text-ink">
            Eine Anbindung wäre nur möglich, wenn SCHULHUB BS dein IServ-Passwort kennt oder die Schule eine offizielle
            Anmeldung (z. B. per IServ-Single-Sign-On/OAuth) für diese App freischaltet. Ohne Freigabe der Schule werden
            hier bewusst keine Logins automatisiert oder Seiten ausgelesen.
          </p>
        </Card>
      </div>
    </>
  )
}
