import { useCallback, useRef, useEffect } from 'react'

export function useAudio() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const resolveVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      voiceRef.current =
        voices.find(v => v.lang.startsWith('en-US') && v.name.includes('Female')) ??
        voices.find(v => v.lang.startsWith('en')) ??
        null
    }

    resolveVoice()
    window.speechSynthesis.addEventListener('voiceschanged', resolveVoice)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', resolveVoice)
  }, [])

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.75
    utterance.pitch = 1.0
    utterance.lang = 'en-US'

    if (voiceRef.current) utterance.voice = voiceRef.current

    window.speechSynthesis.speak(utterance)
  }, [])

  return { speak }
}
