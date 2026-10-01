import { createContext, useContext, useEffect, useRef, useState } from 'react'

const UserContext = createContext(null)

export const useUser = () => useContext(UserContext)

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem('annotatorUser') || '',
  )
  const [users, setUsers] = useState([])
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const pendingUserActionRef = useRef(null)

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (response.ok) setUsers(data.users ?? [])
    } catch {
      // picker still usable for creating a first user even if this fails
    }
  }

  const openUserPicker = () => {
    fetchUsers()
    setUserPickerOpen(true)
  }

  // Runs `action(name)` immediately if a user identity is already chosen;
  // otherwise opens the picker and resumes `action(name)` once one is
  // selected/verified. `action` always receives the resolved name directly
  // (not just via the `currentUser` state) so it can be used synchronously
  // even in the same click that just picked the user, before React re-renders.
  const requireUser = (action) => {
    if (currentUser) {
      action(currentUser)
      return
    }
    pendingUserActionRef.current = action
    openUserPicker()
  }

  const confirmUser = (name) => {
    setCurrentUser(name)
    localStorage.setItem('annotatorUser', name)
    setUserPickerOpen(false)
    const action = pendingUserActionRef.current
    pendingUserActionRef.current = null
    if (action) action(name)
  }

  // Closing the picker without picking also drops any queued action from
  // requireUser — otherwise a stale pending action would fire the next
  // time confirmUser runs from an unrelated context.
  const closeUserPicker = () => {
    pendingUserActionRef.current = null
    setUserPickerOpen(false)
  }

  const switchUser = () => {
    setCurrentUser('')
    localStorage.removeItem('annotatorUser')
    openUserPicker()
  }

  // Validate a stored identity against the server on load — if the user was
  // removed/renamed server-side (e.g. users table reset), don't keep
  // attributing this browser's annotations to a name that no longer exists.
  useEffect(() => {
    const stored = localStorage.getItem('annotatorUser')
    if (!stored) return
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        const exists = (data.users ?? []).some((u) => u.name === stored)
        if (!exists) {
          localStorage.removeItem('annotatorUser')
          setCurrentUser('')
        }
      })
      .catch(() => {
        // server unreachable at boot — keep the stored name, don't punish
        // the user for a transient network hiccup
      })
  }, [])

  const value = {
    currentUser,
    users,
    userPickerOpen,
    fetchUsers,
    openUserPicker,
    requireUser,
    confirmUser,
    closeUserPicker,
    switchUser,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
