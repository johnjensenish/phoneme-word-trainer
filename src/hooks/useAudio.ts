import { useCallback, useEffect, useRef } from 'react'
import type { ComputedWordCard } from '~/data/types'
import { getTargetSoundId } from '~/engine/drillMode'

const noop = () => {}

function audioUrl(type: 'words' | 'phonemes', id: string): string {
  return `/audio/${type}/${encodeURIComponent(id)}.mp3`
}

/** Fallback: speak text via Web Speech API */
function speakFallback(text: string): void {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.75
  u.lang = 'en-US'
  window.speechSynthesis.speak(u)
}

export function useAudio() {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  const stopAll = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  /** Play a URL, tracking the element so stopAll() can cancel it */
  const playTracked = useCallback((url: string): Promise<void> => {
    const audio = new Audio(url)
    currentAudioRef.current = audio
    return new Promise<void>((resolve, reject) => {
      audio.addEventListener('ended', () => resolve())
      audio.addEventListener('error', () => reject(new Error(`Failed: ${url}`)))
      audio.play().catch(reject)
    })
  }, [])

  /** Play a word's audio file (filename is the word text, e.g. "truck.mp3") */
  const speak = useCallback((word: string) => {
    if (typeof window === 'undefined') return
    stopAll()
    playTracked(audioUrl('words', word)).catch(() => {
      speakFallback(word)
    })
  }, [stopAll, playTracked])

  /** Play an isolated phoneme sound */
  const speakPhoneme = useCallback((soundId: string) => {
    if (typeof window === 'undefined') return
    stopAll()
    playTracked(audioUrl('phonemes', soundId)).catch(() => {
      speakFallback(soundId)
    })
  }, [stopAll, playTracked])

  /** Play phoneme, pause, then word (for phoneme display prompts) */
  const speakPhonemeDisplay = useCallback(async (soundId: string, word: string) => {
    if (typeof window === 'undefined') return
    stopAll()
    try {
      await playTracked(audioUrl('phonemes', soundId))
      await new Promise(r => setTimeout(r, 400))
      await playTracked(audioUrl('words', word))
    } catch {
      speakFallback(word)
    }
  }, [stopAll, playTracked])

  if (typeof window === 'undefined') {
    return {
      speak: noop as unknown as typeof speak,
      speakPhoneme: noop as unknown as typeof speakPhoneme,
      speakPhonemeDisplay: noop as unknown as typeof speakPhonemeDisplay,
      stopAll: noop,
    }
  }

  return { speak, speakPhoneme, speakPhonemeDisplay, stopAll }
}

/** Prefetch audio files for a card so playback feels instant */
export function usePrefetchAudio(card: ComputedWordCard | undefined) {
  const soundId = card ? getTargetSoundId(card.word, card.drill_mode) : null

  useEffect(() => {
    if (!card || typeof document === 'undefined') return

    const urls = [audioUrl('words', card.word.word)]
    if (soundId) urls.push(audioUrl('phonemes', soundId))

    const links: HTMLLinkElement[] = []
    for (const href of urls) {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'audio'
      link.href = href
      document.head.appendChild(link)
      links.push(link)
    }

    return () => { links.forEach(l => l.remove()) }
  }, [card?.word.word, soundId])
}
