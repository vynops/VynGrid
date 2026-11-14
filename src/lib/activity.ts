import type { ActivityEvent, ProductConfig } from '../types'

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function text(...values: unknown[]): string {
  return values.find(value => typeof value === 'string' && value.trim())?.toString().trim() ?? ''
}

function isAuthenticationEvent(value: string): boolean {
  const separated = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return /^(?:login|logout|auth|authentication|session)(?:$|[^a-z0-9])/i.test(separated)
}

export function escalationMessage(event: ActivityEvent): string {
  const labels: Record<NonNullable<ActivityEvent['outcome']>, string> = {
    sent: 'Escalation step delivered',
    not_applicable: 'No applicable notification channels',
    configuration_error: 'Escalation configuration issue',
    retrying: 'Escalation failed; retry pending',
    retry_exhausted: 'Escalation failed; retries exhausted',
  }
  const outcome = event.outcome ? labels[event.outcome]
    : event.success === false ? 'Escalation incomplete'
    : event.success === true ? 'Escalation step delivered'
    : 'Escalation attempt; outcome unavailable'
  return `${event.incidentTitle || 'Incident details unavailable'} - ${outcome}`
}

export function normalizeActivity(product: ProductConfig, value: unknown): ActivityEvent[] {
  const objectValue = record(value)
  const source = Array.isArray(value) ? value
    : objectValue.events ?? objectValue.entries ?? objectValue.alerts ?? objectValue.incidents
      ?? objectValue.deployments ?? objectValue.runs ?? objectValue.active ?? objectValue.data ?? []
  if (!Array.isArray(source)) throw new Error('Activity endpoint returned an invalid event list')
  const records = source.flatMap(value => {
    const active = record(value).active
    return Array.isArray(active) ? active : [value]
  })
  return records.flatMap((value, index): ActivityEvent[] => {
    const item = record(value)
    const timestamp = text(item.timestamp, item.ts, item.createdAt, item.created_at, item.updatedAt, item.updated_at, item.deployedAt, item.finishedAt, item.ALERT_TIMESTAMP)
    if (!timestamp || Number.isNaN(Date.parse(timestamp))) return []
    const action = text(item.action, item.event, item.kind, item.type, item.status)
    if (isAuthenticationEvent(action)) return []
    const detail = text(item.message, item.detail, item.title, item.name, item.description, item.ALERT_DETAILS, item.ALERT_NAME, item.ALERT_DESCRIPTION)
    if (isAuthenticationEvent(detail) || /^(signed in|signed out|too many failed attempts|wrong password)/i.test(detail)) return []
    const deployment = text(item.pipelineName, item.version, item.environment)
    const message = detail || (deployment ? `Deployment ${deployment}${item.status ? ` (${String(item.status)})` : ''}` : action ? `${product.name}: ${action}` : '')
    if (!message) return []
    const rawType = `${text(item.type, item.kind, item.action, item.event, item.status)} ${product.activityPath ?? ''}`.toLowerCase()
    const type = rawType.includes('deploy') ? 'deployment' : rawType.includes('incident') ? 'incident' : rawType.includes('alert') || rawType.includes('anomal') ? 'alert' : rawType.includes('resolv') ? 'resolve' : 'info'
    const details = record(item.details)
    const rawSeverity = text(item.severity, item.level, details.incidentSeverity, item.ALERT_RATING ? Number(item.ALERT_RATING) >= 5 ? 'critical' : 'warning' : 'info').toLowerCase()
    const severity = rawSeverity === 'critical' ? 'critical'
      : rawSeverity === 'warning' || (product.id === 'vyndb' && rawSeverity === 'high') ? 'warning' : 'info'
    const eventId = text(item.id, item.eventId, item.ALERT_ID, item.runId, item.deploymentId) || String(index)
    const event: ActivityEvent = {
      id: `${product.id}:${eventId}:${timestamp}`, productId: product.id, productName: product.name,
      type, message, severity, timestamp, source: product.activityPath,
    }
    if (product.id === 'vyndb' && action === 'incident.escalate') {
      event.action = action
      event.resourceId = text(item.resourceId) || undefined
      event.incidentId = text(details.incidentId) || undefined
      event.incidentTitle = text(details.incidentTitle) || undefined
      event.incidentStatus = text(details.incidentStatus) || undefined
      event.success = typeof item.success === 'boolean' ? item.success : undefined
      event.policy = text(details.policy) || undefined
      event.step = typeof details.step === 'number' && Number.isInteger(details.step) ? details.step : undefined
      event.attempt = typeof details.attempt === 'number' && Number.isInteger(details.attempt) && details.attempt > 0 ? details.attempt : undefined
      const outcome = details.outcome
      if (outcome === 'sent' || outcome === 'not_applicable' || outcome === 'configuration_error' || outcome === 'retrying' || outcome === 'retry_exhausted') event.outcome = outcome
      const nextRetryAt = text(details.nextRetryAt)
      if (nextRetryAt && !Number.isNaN(Date.parse(nextRetryAt))) event.nextRetryAt = nextRetryAt
      if (Array.isArray(details.channels)) {
        event.channels = details.channels.flatMap((value): NonNullable<ActivityEvent['channels']> => {
          const { channel, outcome } = record(value)
          if ((channel === 'slack' || channel === 'teams' || channel === 'webhook' || channel === 'email' || channel === 'oncall') &&
              (outcome === 'sent' || outcome === 'not_applicable' || outcome === 'configuration_error' || outcome === 'failed')) {
            return [{ channel, outcome }]
          }
          return []
        })
      }
      event.message = escalationMessage(event)
    }
    return [event]
  })
}

export function enrichIncidentEvents(events: ActivityEvent[], value: unknown): ActivityEvent[] {
  if (!Array.isArray(value)) throw new Error('Incident endpoint returned an invalid incident list')
  const incidents = new Map<string, Record<string, unknown>>()
  for (const valueItem of value) {
    const incident = record(valueItem)
    const id = text(incident.id)
    if (id) incidents.set(id, incident)
  }
  return events.map(event => {
    if (event.productId !== 'vyndb' || event.action !== 'incident.escalate') return event
    const incident = incidents.get(event.incidentId ?? event.resourceId ?? '')
    if (!incident) return event
    const enriched: ActivityEvent = {
      ...event,
      incidentId: text(incident.id),
      incidentTitle: event.incidentTitle || text(incident.title) || undefined,
      incidentStatus: event.incidentStatus || text(incident.status) || undefined,
    }
    const severity = text(incident.severity).toLowerCase()
    enriched.severity = severity === 'critical' ? 'critical' : severity === 'high' || severity === 'warning' ? 'warning' : 'info'
    enriched.message = escalationMessage(enriched)
    return enriched
  })
}

export function groupEscalationAttempts(events: ActivityEvent[]): ActivityEvent[] {
  const grouped = new Map<string, ActivityEvent>()
  for (const event of events) {
    const key = event.productId === 'vyndb' && event.action === 'incident.escalate' && event.incidentId
      ? `${event.productId}:escalation:${event.incidentId}`
      : event.id
    const previous = grouped.get(key)
    if (!previous) {
      grouped.set(key, { ...event, occurrences: 1 })
      continue
    }
    const latest = Date.parse(event.timestamp) > Date.parse(previous.timestamp) ? event : previous
    grouped.set(key, { ...latest, occurrences: (previous.occurrences ?? 1) + 1 })
  }
  return [...grouped.values()].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
}
