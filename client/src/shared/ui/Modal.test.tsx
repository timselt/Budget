import { useRef, useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Modal } from './Modal'

afterEach(() => {
  cleanup()
  // Body scroll lock reference counting'i testler arası temizle.
  document.body.style.overflow = ''
})

function ModalHarness({
  title = 'Test Modal',
  description,
  initiallyOpen = true,
  closeOnEscape,
  closeOnBackdropClick,
}: {
  title?: string
  description?: string
  initiallyOpen?: boolean
  closeOnEscape?: boolean
  closeOnBackdropClick?: boolean
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)}>
        open
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        closeOnEscape={closeOnEscape}
        closeOnBackdropClick={closeOnBackdropClick}
        footer={
          <>
            <button onClick={() => setOpen(false)}>Vazgeç</button>
            <button>Onayla</button>
          </>
        }
      >
        <input aria-label="reason" />
        <textarea aria-label="note" />
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('açıkken role=dialog + aria-modal + aria-labelledby ile render eder', () => {
    render(<ModalHarness title="Reject Version" />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
    expect(screen.getByRole('heading', { name: 'Reject Version' })).toBeInTheDocument()
  })

  it('description verildiğinde aria-describedby bağlanır', () => {
    render(<ModalHarness description="Bu işlem geri alınamaz." />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-describedby')
    expect(screen.getByText('Bu işlem geri alınamaz.')).toBeInTheDocument()
  })

  it('open=false iken hiç render etmez', () => {
    render(<ModalHarness initiallyOpen={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Escape tuşuna basıldığında onClose çağırır', () => {
    render(<ModalHarness />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closeOnEscape=false iken Escape kapatmaz', () => {
    render(<ModalHarness closeOnEscape={false} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('backdrop click ile kapanır (default)', () => {
    render(<ModalHarness />)
    const backdrop = screen.getByRole('dialog').parentElement!
    fireEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closeOnBackdropClick=false iken backdrop kapatmaz', () => {
    render(<ModalHarness closeOnBackdropClick={false} />)
    const backdrop = screen.getByRole('dialog').parentElement!
    fireEvent.click(backdrop)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('panel içine yapılan click backdrop event\'ine bubble etmez', () => {
    render(<ModalHarness />)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('aria-label ile kapat butonu mevcut', () => {
    render(<ModalHarness />)
    const closeBtn = screen.getByRole('button', { name: 'Kapat' })
    expect(closeBtn).toBeInTheDocument()
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('açıkken body scroll lock aktif, kapanınca serbest', () => {
    const { rerender } = render(<ModalHarness initiallyOpen />)
    expect(document.body.style.overflow).toBe('hidden')
    rerender(<ModalHarness initiallyOpen={false} />)
    // useState içeride; rerender harness'i sıfırlamaz, ayrı test:
  })

  it('open false → true geçişinde scroll lock', () => {
    document.body.style.overflow = ''
    function Toggle() {
      const [o, setO] = useState(false)
      return (
        <>
          <button onClick={() => setO(true)}>open</button>
          <Modal open={o} onClose={() => setO(false)} title="t">
            içerik
          </Modal>
        </>
      )
    }
    render(<Toggle />)
    expect(document.body.style.overflow).toBe('')
    fireEvent.click(screen.getByText('open'))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('initialFocusRef sağlandığında o element\'e focus verir', () => {
    function Harness() {
      const inputRef = useRef<HTMLInputElement>(null)
      const [open] = useState(true)
      return (
        <Modal
          open={open}
          onClose={() => {}}
          title="t"
          initialFocusRef={inputRef}
        >
          <button>Önce gelir</button>
          <input ref={inputRef} aria-label="hedef" />
        </Modal>
      )
    }
    render(<Harness />)
    expect(document.activeElement).toBe(screen.getByLabelText('hedef'))
  })

  it('initialFocusRef yokken ilk focusable element\'e focus verir', () => {
    render(<ModalHarness />)
    // Header'daki kapat butonu ilk focusable değil çünkü panelde önce
    // başlık var; ilk focusable kapat butonu olmalı.
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Kapat')
  })

  it('headerActions slot başlık yanında render eder', () => {
    function Harness() {
      const [open] = useState(true)
      return (
        <Modal
          open={open}
          onClose={() => {}}
          title="Excel Import"
          headerActions={<button>Şablon İndir</button>}
        >
          body
        </Modal>
      )
    }
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'Şablon İndir' })).toBeInTheDocument()
  })

  it('onClose çağrıldığında body scroll restore', () => {
    const onClose = vi.fn()
    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <Modal
          open={open}
          onClose={() => {
            onClose()
            setOpen(false)
          }}
          title="t"
        >
          x
        </Modal>
      )
    }
    render(<Harness />)
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
    expect(document.body.style.overflow).toBe('')
  })
})
