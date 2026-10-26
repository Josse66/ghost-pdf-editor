// Solo desarrollo (break-ui): abre PDFs de prueba por la misma vía que un usuario, un File.
// Se monta desde main.tsx únicamente con import.meta.env.DEV; no llega al build de producción.
import { useEffect, useState } from 'react'
import { useLang } from '@/i18n'
import { useDocument } from '@/store/document'

const BREAK = '/test-fixtures/generated/break-ui'
const FIXTURES = [
  { id: 'demo', label: 'Demo', path: '/test-fixtures/generated/cv-calibri.pdf' },
  {
    id: 'long-name',
    label: 'Nombre largo',
    path: `${BREAK}/CV_Aleksandra-Wisniewska-Kowalczyk_Desarrolladora-Full-Stack_Northwind-Industries-Holdings_2026-10-26_version-final-FINAL(3).pdf`,
  },
  { id: '300', label: '300 págs', path: '/test-fixtures/generated/largo-300-paginas.pdf' },
  { id: 'mixed', label: 'Tamaños', path: `${BREAK}/tamanos-mixtos.pdf` },
  { id: 'rotated', label: 'Rotada', path: '/test-fixtures/generated/cv-rotado-90.pdf' },
  { id: 'scanned', label: 'Escaneado', path: `${BREAK}/recibo-escaneado.pdf` },
  { id: 'empty', label: 'Vacío', path: `${BREAK}/factura-marzo.pdf` },
  { id: 'truncated', label: 'Truncado', path: `${BREAK}/contrato-truncado.pdf` },
  { id: 'not-pdf', label: 'No PDF', path: `${BREAK}/ine-escaneada.pdf` },
  { id: 'password', label: 'Contraseña', path: `${BREAK}/estado-de-cuenta-protegido.pdf` },
] as const

async function load(path: string) {
  const res = await fetch(encodeURI(path))
  const name = decodeURIComponent(path.split('/').pop()!)
  await useDocument
    .getState()
    .openFile(new File([await res.blob()], name, { type: 'application/pdf' }))
}

export function FixtureSwitch() {
  const params = new URLSearchParams(location.search)
  const [active, setActive] = useState(params.get('fixture'))
  const lang = useLang((s) => s.lang)

  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search)
    const l = fromUrl.get('lang')
    if (l === 'en' || l === 'es') useLang.getState().setLang(l)
    const f = FIXTURES.find((x) => x.id === fromUrl.get('fixture'))
    if (f) void load(f.path)
  }, [])

  const select = (id: string, path: string) => {
    setActive(id)
    const url = new URL(location.href)
    url.searchParams.set('fixture', id)
    history.replaceState(null, '', url)
    void load(path)
  }

  const toggleLang = () => {
    const next = lang === 'es' ? 'en' : 'es'
    useLang.getState().setLang(next)
    const url = new URL(location.href)
    url.searchParams.set('lang', next)
    history.replaceState(null, '', url)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        gap: 2,
        padding: 3,
        maxWidth: 'calc(100vw - 16px)',
        overflowX: 'auto',
        background: '#d4d4d4',
        borderRadius: 999,
        font: '12px system-ui, sans-serif',
      }}
    >
      {FIXTURES.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => select(f.id, f.path)}
          style={{
            padding: '4px 10px',
            border: 0,
            borderRadius: 999,
            whiteSpace: 'nowrap',
            background: active === f.id ? '#fff' : 'transparent',
            color: '#222',
          }}
        >
          {f.label}
        </button>
      ))}
      <button
        type="button"
        onClick={toggleLang}
        style={{
          padding: '4px 10px',
          border: 0,
          borderRadius: 999,
          background: '#fff',
          color: '#222',
        }}
      >
        {lang.toUpperCase()}
      </button>
    </div>
  )
}
