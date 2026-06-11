import { useState, useEffect, useRef } from 'react'

const RECEIVER_APP_ID = 'CC1AD845' // Default Chromecast receiver app

export function useCastSession() {
  const [castAvailable, setCastAvailable] = useState(false)
  const [castConnected, setCastConnected] = useState(false)
  const [castSession, setCastSession] = useState(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current || typeof window === 'undefined' || !window.chrome?.cast) return
    initRef.current = true

    const initializeCast = () => {
      const sessionRequest = new window.chrome.cast.SessionRequest(RECEIVER_APP_ID)
      const apiConfig = new window.chrome.cast.ApiConfig(
        sessionRequest,
        sessionReady,
        receiverListener,
        window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
      )

      window.chrome.cast.initialize(apiConfig, onInitSuccess, onInitError)
    }

    const sessionReady = (session) => {
      setCastSession(session)
      setCastConnected(true)
    }

    const receiverListener = (isAvailable) => {
      setCastAvailable(isAvailable)
    }

    const onInitSuccess = () => {
      setCastAvailable(true)
    }

    const onInitError = (error) => {
      console.error('Cast initialization error:', error)
    }

    // Wait a bit for Cast SDK to load
    setTimeout(initializeCast, 1000)

    return () => {
      if (castSession?.isConnected) {
        castSession.stop(() => {}, () => {})
      }
    }
  }, [])

  const requestSession = () => {
    if (!window.chrome?.cast) return
    window.chrome.cast.requestSession(
      (session) => {
        setCastSession(session)
        setCastConnected(true)
      },
      (error) => {
        console.error('Cast session request error:', error)
      }
    )
  }

  const stopCasting = () => {
    if (castSession?.isConnected) {
      castSession.stop(
        () => {
          setCastSession(null)
          setCastConnected(false)
        },
        (error) => console.error('Error stopping cast:', error)
      )
    }
  }

  return {
    castAvailable,
    castConnected,
    castSession,
    requestSession,
    stopCasting,
  }
}
