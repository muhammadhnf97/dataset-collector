import { useState } from 'react'
import Modal from './Modal'

export default function UserPickerModal({ users, onConfirm, onClose }) {
  const [mode, setMode] = useState('pick') // 'pick' | 'create' | 'password'
  const [target, setTarget] = useState(null) // name pending password check
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('worker')
  const [newPassword, setNewPassword] = useState('')
  const [password, setPassword] = useState('')

  const pickUser = (user) => {
    if (user.role === 'superadmin') {
      setTarget(user.name)
      setMode('password')
      setError('')
      setPassword('')
    } else {
      onConfirm(user.name)
    }
  }

  const submitPassword = async () => {
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(target)}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        onConfirm(data.name)
      } else {
        setError(data.detail ?? 'Incorrect password')
      }
    } catch {
      setError('Could not reach the server')
    }
  }

  const submitNewUser = async () => {
    const name = newName.trim()
    if (!name) {
      setError('Name required')
      return
    }
    if (newRole === 'superadmin' && !newPassword) {
      setError('Password required for superadmin')
      return
    }
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role: newRole,
          password: newRole === 'superadmin' ? newPassword : undefined,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        onConfirm(data.name)
      } else {
        setError(data.detail ?? 'Could not create user')
      }
    } catch {
      setError('Could not reach the server')
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm" bodyClassName="p-6">
      <h3 className="text-lg font-semibold text-slate-800">Who's working?</h3>
      <p className="mt-1 text-sm text-slate-500">
        Pick your name to attribute annotations and activity.
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {mode === 'pick' && (
        <div className="mt-4">
          {users.length > 0 ? (
            <div className="max-h-52 space-y-1 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => pickUser(u)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-indigo-50"
                >
                  <span>{u.name}</span>
                  {u.role === 'superadmin' && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                      admin
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No users yet — create one below.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setMode('create')
              setError('')
            }}
            className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
          >
            + New user
          </button>
        </div>
      )}

      {mode === 'password' && (
        <div className="mt-4">
          <p className="text-sm text-slate-600">
            <span className="font-medium">{target}</span> is an admin account —
            enter the password.
          </p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="Password"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode('pick')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submitPassword}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-600"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <div className="mt-4 space-y-3">
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="Your name"
          />
          <div className="flex gap-2">
            {['worker', 'superadmin'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setNewRole(role)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
                  newRole === role
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          {newRole === 'superadmin' && (
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="Password"
            />
          )}
          <div className="flex justify-end gap-2">
            {users.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMode('pick')
                  setError('')
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={submitNewUser}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-600"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
