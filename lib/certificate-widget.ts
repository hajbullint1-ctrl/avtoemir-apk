import { Capacitor, registerPlugin } from '@capacitor/core'

type CertificateWidgetPayload = {
  loggedIn: boolean
  fullName: string
  schoolName: string
  certificateNumber: string
  date: string
  status: string
}

interface CertificateWidgetPlugin {
  update(data: CertificateWidgetPayload): Promise<void>
}

const CertificateWidget = registerPlugin<CertificateWidgetPlugin>('CertificateWidget')

const STATUS_LABEL: Record<string, string> = {
  draft: 'Черновик',
  pending: 'На проверке',
  approved: 'Подтверждён',
  rejected: 'Отклонён',
}

/** Stable certificate number from the student account id. */
export function certificateNumberFromId(accountId: string): string {
  const compact = accountId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const tail = (compact || '000000').slice(-6).padStart(6, '0')
  return `AE-${tail}`
}

function formatDate(raw: string): string {
  if (!raw) return '—'
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString('ru-RU')
}

/** Push the signed-in student's certificate into the Android home-screen widget. No-op on web/iOS. */
export async function syncCertificateWidget(input: {
  loggedIn: boolean
  fullName: string
  schoolName: string
  accountId: string
  date: string
  status: string
}): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return
  try {
    await CertificateWidget.update({
      loggedIn: input.loggedIn,
      fullName: input.loggedIn ? input.fullName : '',
      schoolName: input.schoolName || 'AvtoEmir',
      certificateNumber: input.loggedIn ? certificateNumberFromId(input.accountId) : '',
      date: input.loggedIn ? formatDate(input.date) : '—',
      status: input.loggedIn ? STATUS_LABEL[input.status] || input.status || '—' : 'Войдите в приложение',
    })
  } catch (error) {
    console.warn('[widget]', error)
  }
}
