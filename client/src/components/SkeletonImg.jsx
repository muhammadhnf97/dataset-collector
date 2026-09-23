import { useState } from 'react'

export default function SkeletonImg({ className = '', onLoad, onError, ...props }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <img
      {...props}
      onLoad={(e) => {
        setLoaded(true)
        onLoad?.(e)
      }}
      onError={(e) => {
        setLoaded(true)
        onError?.(e)
      }}
      className={`${className} ${loaded ? '' : 'animate-pulse bg-slate-200'}`}
    />
  )
}
