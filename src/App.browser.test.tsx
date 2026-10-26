import { createRoot } from 'react-dom/client'
import { page } from 'vitest/browser'
import { afterEach, beforeEach, expect, it } from 'vitest'
import App from './App'
import { useLang } from './i18n'
import './index.css'

let container: HTMLDivElement | undefined

beforeEach(() => useLang.setState({ lang: 'es' }))
afterEach(() => container?.remove())

it('sin documento, la lámina invita a abrir el PDF y promete privacidad', async () => {
  container = document.createElement('div')
  document.body.append(container)
  createRoot(container).render(<App />)

  await expect.element(page.getByRole('heading', { name: 'Abre tu PDF' })).toBeVisible()
  await expect.element(page.getByRole('button', { name: 'Elegir PDF' })).toBeVisible()
  await expect.element(page.getByText('Tu PDF nunca sale de este dispositivo.')).toBeVisible()
})
