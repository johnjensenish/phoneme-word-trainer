/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import * as React from 'react'
import globalCss from '~/styles/global.css?url'

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Phoneme Word Trainer — Help Your Toddler Hear and Say New Sounds' },
      { name: 'description', content: 'A parent-led flashcard app for toddler speech development, based on speech sound acquisition research.' },
    ],
    links: [
      { rel: 'stylesheet', href: globalCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  return <Outlet />
}

function NotFound() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-family)', color: 'var(--color-text)' }}>
      <p style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</p>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Page not found</h1>
      <Link to="/app" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>Go to the app</Link>
    </div>
  )
}
