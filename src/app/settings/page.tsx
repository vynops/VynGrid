'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Settings, Save, ExternalLink, Check, LoaderCircle, Eye, EyeOff } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { CommandPalette } from '@/components/command/CommandPalette'
import { cn, resolveProductUrl } from '@/lib/utils'
import { COLOR_CLASSES } from '@/lib/products'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { useGridContext }    from '@/components/providers'
import type { GridConfig, ProductConfig } from '@/types'

export default function SettingsPage() {
  const [config,  setConfig]  = useState<GridConfig | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string; configured: boolean; testing?: boolean; result?: string }>>({})
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordVisible, setPasswordVisible] = useState({ current: false, next: false, confirm: false })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordResult, setPasswordResult] = useState<string | null>(null)

  useCommandPalette()
  const { commandOpen, openCommand, closeCommand } = useGridContext()
  const enabledProducts = config?.products.filter(p => p.enabled) ?? []

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setConfig)
      .catch(() => setError('Failed to load configuration'))
    fetch('/api/config/credentials')
      .then(r => r.json())
      .then((data: { configured: string[] }) => setCredentials(Object.fromEntries(data.configured.map(id => [id, { username: '', password: '', configured: true }] ))))
      .catch(() => {})
  }, [])

  async function saveCredential(productId: string) {
    const credential = credentials[productId]
    if (!credential?.username || !credential.password) return
    const response = await fetch('/api/config/credentials', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, username: credential.username, password: credential.password }) })
    const data = await response.json()
    setCredentials(current => ({ ...current, [productId]: { ...credential, configured: response.ok, password: '', result: response.ok ? 'Credentials saved' : data.error } }))
  }

  async function testCredential(productId: string) {
    setCredentials(current => ({ ...current, [productId]: { ...current[productId], testing: true } }))
    const response = await fetch('/api/config/credentials/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) })
    const data = await response.json()
    setCredentials(current => ({ ...current, [productId]: { ...current[productId], testing: false, result: data.ok ? 'Connected' : data.error } }))
  }

  async function handleSave() {
    if (!config) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/config', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function updateProduct(id: string, patch: Partial<ProductConfig>) {
    setConfig(c => c ? {
      ...c,
      products: c.products.map(p => p.id === id ? { ...p, ...patch } : p),
    } : c)
  }

  async function changePassword() {
    if (passwords.next !== passwords.confirm) {
      setPasswordResult('New password confirmation does not match')
      return
    }
    setChangingPassword(true)
    setPasswordResult(null)
    try {
      const response = await fetch('/api/account/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Unable to change password')
      await signOut({ callbackUrl: '/login' })
    } catch (changeError) {
      setPasswordResult(changeError instanceof Error ? changeError.message : 'Unable to change password')
      setChangingPassword(false)
    }
  }

  return (
    <>
      <TopBar onCommandOpen={openCommand} />
      <main className="flex-1 px-6 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
              <Settings size={18} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Grid Settings</h1>
              <p className="text-xs text-slate-500">Configure product URLs and grid behaviour</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !config}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all',
              saved
                ? 'bg-green-600 border border-green-500'
                : 'bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/50',
              (saving || !config) && 'opacity-50 cursor-not-allowed',
            )}
          >
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        {!config ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            Loading configuration…
          </div>
        ) : (
          <div className="space-y-6">
            <section className="p-5 rounded-2xl border border-surface-800 bg-surface-900/60">
              <h2 className="text-sm font-semibold text-white">Account Security</h2>
              <p className="mt-1 text-xs text-slate-500">Changing your password signs out this session.</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['current', 'next', 'confirm'] as const).map(field => (
                  <div key={field} className="relative">
                    <input type={passwordVisible[field] ? 'text' : 'password'} value={passwords[field]} onChange={event => setPasswords(current => ({ ...current, [field]: event.target.value }))} placeholder={field === 'current' ? 'Current password' : field === 'next' ? 'New password (8+ characters)' : 'Confirm new password'} autoComplete={field === 'current' ? 'current-password' : 'new-password'} className="w-full px-3 py-2 pr-10 rounded-lg bg-surface-800 border border-surface-700 text-xs text-white" />
                    <button type="button" onClick={() => setPasswordVisible(current => ({ ...current, [field]: !current[field] }))} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-white" aria-label={`${passwordVisible[field] ? 'Hide' : 'Show'} ${field === 'next' ? 'new' : field === 'confirm' ? 'confirmed' : 'current'} password`} title={passwordVisible[field] ? 'Hide password' : 'Show password'}>
                      {passwordVisible[field] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button type="button" onClick={changePassword} disabled={changingPassword || !passwords.current || !passwords.next || !passwords.confirm} className="px-3 py-1.5 rounded-md border border-cyan-500/30 text-2xs text-cyan-400 disabled:opacity-40">{changingPassword ? 'Changing...' : 'Change Password'}</button>
                {passwordResult && <span className="text-2xs text-red-400">{passwordResult}</span>}
              </div>
            </section>

            {/* Global settings */}
            <div className="p-5 rounded-2xl border border-surface-800 bg-surface-900/60">
              <h2 className="text-sm font-semibold text-white mb-4">Global</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Grid Name</label>
                  <input
                    value={config.gridName}
                    onChange={e => setConfig(c => c ? { ...c, gridName: e.target.value } : c)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Refresh Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={config.refreshIntervalSeconds}
                    onChange={e => setConfig(c => c ? { ...c, refreshIntervalSeconds: Number(e.target.value) } : c)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Products */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Products</h2>
              <div className="space-y-3">
                {config.products.map(product => {
                  const cc = COLOR_CLASSES[product.color]
                  return (
                    <div
                      key={product.id}
                      id={product.id}
                      className={cn(
                        'p-5 rounded-2xl border transition-all',
                        product.enabled
                          ? `${cc.border} bg-surface-900/80`
                          : 'border-surface-800 bg-surface-900/40 opacity-60',
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Enable toggle */}
                        <button
                          onClick={() => updateProduct(product.id, { enabled: !product.enabled })}
                          className={cn(
                            'mt-1 relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors focus:outline-none',
                            product.enabled
                              ? `${cc.btn} border-transparent`
                              : 'bg-surface-700 border-surface-600',
                          )}
                          aria-label={product.enabled ? 'Disable' : 'Enable'}
                        >
                          <span className={cn(
                            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
                            product.enabled ? 'translate-x-4' : 'translate-x-0.5',
                          )} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={cn('text-sm font-bold', cc.text)}>{product.name}</span>
                            <span className="text-xs text-slate-500">{product.tagline}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-2xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                                Base URL
                              </label>
                              <div className="flex gap-2">
                                <input
                                  value={product.url}
                                  onChange={e => updateProduct(product.id, { url: e.target.value })}
                                  placeholder="http://localhost:3030"
                                  className="flex-1 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                />
                                <a
                                  href={resolveProductUrl(product)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center w-9 rounded-lg border border-surface-700 text-slate-500 hover:text-white hover:border-surface-600 transition-all"
                                  aria-label="Open product"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              </div>
                            </div>
                            <div>
                              <label className="block text-2xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                                Health Check Path
                              </label>
                              <input
                                value={product.healthPath}
                                onChange={e => updateProduct(product.id, { healthPath: e.target.value })}
                                placeholder="/api/health"
                                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-2xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                                Activity Data Path
                              </label>
                              <input
                                value={product.activityPath ?? ''}
                                onChange={e => updateProduct(product.id, { activityPath: e.target.value || undefined })}
                                placeholder="/api/activity"
                                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            <input type="text" value={credentials[product.id]?.username ?? ''} onChange={e => setCredentials(current => ({ ...current, [product.id]: { ...current[product.id], username: e.target.value, password: current[product.id]?.password ?? '', configured: current[product.id]?.configured ?? false } }))} placeholder="Integration username" autoComplete="off" className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs text-white" />
                            <input type="password" value={credentials[product.id]?.password ?? ''} onChange={e => setCredentials(current => ({ ...current, [product.id]: { ...current[product.id], username: current[product.id]?.username ?? '', password: e.target.value, configured: current[product.id]?.configured ?? false } }))} placeholder={credentials[product.id]?.configured ? 'Password saved' : 'Integration password'} autoComplete="new-password" className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs text-white" />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button type="button" onClick={() => saveCredential(product.id)} className="px-3 py-1.5 rounded-md bg-surface-800 border border-surface-700 text-2xs text-slate-300 hover:text-white">Save Connection</button>
                            <button type="button" onClick={() => testCredential(product.id)} disabled={!credentials[product.id]?.configured || credentials[product.id]?.testing} className="px-3 py-1.5 rounded-md border border-cyan-500/30 text-2xs text-cyan-400 disabled:opacity-40">{credentials[product.id]?.testing ? <LoaderCircle size={12} className="animate-spin" /> : 'Test Connection'}</button>
                            <span className="text-2xs text-slate-500">{credentials[product.id]?.result ?? (credentials[product.id]?.configured ? 'Credentials saved' : 'Not configured')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
      <CommandPalette open={commandOpen} onClose={closeCommand} products={enabledProducts} />
    </>
  )
}
