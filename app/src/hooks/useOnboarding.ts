import { useState } from 'react'

const KEY = 'tt_onboarded'

export function useOnboarding() {
  const [done, setDone] = useState(() => localStorage.getItem(KEY) === '1')

  const complete = () => {
    localStorage.setItem(KEY, '1')
    setDone(true)
  }

  const reset = () => {
    localStorage.removeItem(KEY)
    setDone(false)
  }

  return { showOnboarding: !done, complete, reset }
}
