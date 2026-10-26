import { createRoot } from 'react-dom/client'
import { page } from 'vitest/browser'
import { afterEach, expect, it } from 'vitest'
import App from './App'
import './index.css'

let container: HTMLDivElement | undefined

afterEach(() => container?.remove())

it('muestra el nombre y la promesa de privacidad', async () => {
  container = document.createElement('div')
  document.body.append(container)
  createRoot(container).render(<App />)

  await expect.element(page.getByRole('heading', { name: 'Ghost PDF Editor' })).toBeVisible()
  await expect.element(page.getByText('Tu PDF nunca sale de este dispositivo.')).toBeVisible()
})
