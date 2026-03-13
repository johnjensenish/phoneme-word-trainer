import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '~/components/landing/Hero'
import { Methodology } from '~/components/landing/Methodology'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <main>
      <Hero />
      <Methodology />
      <footer style={{
        textAlign: 'center',
        padding: '64px 16px 40px',
        color: 'var(--color-text-light)',
        fontSize: 'var(--font-size-small)',
        lineHeight: 1.8,
      }}>
        <p>
          Based on Crowe, K., & McLeod, S. (2020).{' '}
          <em>American Journal of Speech-Language Pathology</em>, 29(4).
        </p>
        <p style={{ marginTop: '8px' }}>
          Built with care for parents and toddlers.
        </p>
      </footer>
    </main>
  )
}
