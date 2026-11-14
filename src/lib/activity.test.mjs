import assert from 'node:assert/strict'
import test from 'node:test'
import { enrichIncidentEvents, groupEscalationAttempts, normalizeActivity } from './activity.ts'

const product = { id: 'vyndb', name: 'VynDB', activityPath: '/api/audit' }
const audit = (id, resourceId, createdAt, extra = {}) => ({
  id, resourceId, createdAt, action: 'incident.escalate', success: false,
  details: { policy: 'default', step: 0 }, ...extra,
})

test('new escalation records preserve issue and failed-retry metadata', () => {
  const [event] = normalizeActivity(product, [
    audit('attempt-1', 'incident-1', '2026-11-14T10:00:00Z', {
      details: {
        incidentId: 'incident-1', incidentTitle: 'Backup RPO breach',
        incidentSeverity: 'high', incidentStatus: 'open',
        policy: 'default', step: 0, attempt: 2,
        outcome: 'retrying', nextRetryAt: '2026-11-14T10:10:00Z',
        channels: [
          { channel: 'slack', outcome: 'sent', destination: 'must-not-be-forwarded' },
          { channel: 'email', outcome: 'configuration_error' },
          { channel: 'unknown', outcome: 'unexpected' },
        ],
      },
    }),
  ])
  assert.equal(event.incidentId, 'incident-1')
  assert.equal(event.resourceId, 'incident-1')
  assert.equal(event.success, false)
  assert.equal(event.severity, 'warning')
  assert.equal(event.step, 0)
  assert.equal(event.attempt, 2)
  assert.equal(event.incidentStatus, 'open')
  assert.equal(event.nextRetryAt, '2026-11-14T10:10:00Z')
  assert.deepEqual(event.channels, [
    { channel: 'slack', outcome: 'sent' },
    { channel: 'email', outcome: 'configuration_error' },
  ])
  assert.equal(event.message, 'Backup RPO breach - Escalation failed; retry pending')
})

test('legacy escalation records are enriched only by an exact incident identity', () => {
  const events = normalizeActivity(product, [
    audit('a', 'incident-1', '2026-11-14T10:00:00Z'),
    audit('b', 'database-1', '2026-11-14T10:01:00Z'),
  ])
  const enriched = enrichIncidentEvents(events, [
    { id: 'incident-1', dbId: 'database-1', title: 'Backup RPO breach', severity: 'high', status: 'open' },
  ])
  assert.equal(enriched[0].incidentId, 'incident-1')
  assert.equal(enriched[0].message, 'Backup RPO breach - Escalation incomplete')
  assert.equal(enriched[0].severity, 'warning')
  assert.equal(enriched[1].incidentId, undefined)
  assert.equal(enriched[1].message, 'Incident details unavailable - Escalation incomplete')
})

test('dashboard groups retries by incident, retains newest outcome and preserves raw records', () => {
  const raw = normalizeActivity(product, [
    audit('old', 'one', '2026-11-14T10:00:00Z', { success: true, details: { incidentId: 'one', incidentTitle: 'Backup overdue', outcome: 'sent' } }),
    audit('other', 'two', '2026-11-14T10:05:00Z', { details: { incidentId: 'two', incidentTitle: 'Backup overdue' } }),
    audit('latest', 'one', '2026-11-14T10:10:00Z', { details: { incidentId: 'one', incidentTitle: 'Backup overdue', outcome: 'configuration_error' } }),
  ])
  const grouped = groupEscalationAttempts(raw)
  assert.equal(raw.length, 3)
  assert.equal(raw[0].occurrences, undefined)
  assert.equal(grouped.length, 2)
  assert.equal(grouped[0].incidentId, 'one')
  assert.equal(grouped[0].occurrences, 2)
  assert.equal(grouped[0].timestamp, '2026-11-14T10:10:00Z')
  assert.equal(grouped[0].success, false)
  assert.match(grouped[0].message, /configuration issue/)
  assert.equal(grouped[1].incidentId, 'two')
})

test('one hundred escalation records become four incident items, not one hundred incidents', () => {
  const raw = normalizeActivity(product, Array.from({ length: 100 }, (_, index) =>
    audit(`audit-${index}`, `incident-${index % 4}`, new Date(Date.UTC(2026, 10, 14, 10, index)).toISOString(), {
      details: { incidentId: `incident-${index % 4}`, incidentTitle: 'Backup RPO breach' },
    }),
  ))
  const grouped = groupEscalationAttempts(raw)
  assert.equal(raw.length, 100)
  assert.equal(grouped.length, 4)
  assert.ok(grouped.every(event => event.occurrences === 25 && event.success === false))
  assert.ok(grouped.every(event => event.message === 'Backup RPO breach - Escalation incomplete'))
})

test('missing incident IDs and other products are not merged by repeated messages', () => {
  const raw = normalizeActivity(product, [
    audit('a', undefined, '2026-11-14T10:00:00Z'),
    audit('b', undefined, '2026-11-14T10:01:00Z'),
  ])
  raw.push(
    { ...raw[0], id: 'dc-a', productId: 'vyndc', incidentId: 'same' },
    { ...raw[1], id: 'dc-b', productId: 'vyndc', incidentId: 'same' },
  )
  assert.equal(groupEscalationAttempts(raw).length, 4)
})

test('attempt counts apply to the selected records, not the incident lifetime', () => {
  const raw = normalizeActivity(product, [
    audit('old', 'one', '2026-11-12T10:00:00Z', { details: { incidentId: 'one' } }),
    audit('new', 'one', '2026-11-14T10:00:00Z', { details: { incidentId: 'one', attempt: 5 } }),
  ])
  const grouped = groupEscalationAttempts(raw.filter(event => Date.parse(event.timestamp) >= Date.parse('2026-11-13T10:00:00Z')))
  assert.equal(grouped[0].occurrences, 1)
  assert.equal(grouped[0].attempt, 5)
})

test('normalization preserves authentication filtering and ordinary deployment behavior', () => {
  assert.deepEqual(normalizeActivity(product, [
    { id: 'auth', action: 'login.success', detail: 'Signed in', ts: '2026-11-14T10:00:00Z' },
    { id: 'auth2', action: 'login_success', ts: '2026-11-14T10:00:00Z' },
  ]), [])
  const [event] = normalizeActivity({ ...product, id: 'vyncicd', activityPath: '/api/deployments' }, [
    { id: 'deployment', pipelineName: 'Release', status: 'success', deployedAt: '2026-11-14T10:00:00Z' },
  ])
  assert.equal(event.type, 'deployment')
  assert.equal(event.message, 'Deployment Release (success)')
  assert.equal(event.action, undefined)
})

test('unknown outcomes do not imply success, and invalid incident responses fail explicitly', () => {
  const [event] = normalizeActivity(product, [
    audit('a', 'one', '2026-11-14T10:00:00Z', { success: undefined, details: { outcome: 'unexpected' } }),
  ])
  assert.equal(event.success, undefined)
  assert.match(event.message, /outcome unavailable/)
  assert.throws(() => enrichIncidentEvents([event], { incidents: [] }), /invalid incident list/)
})
