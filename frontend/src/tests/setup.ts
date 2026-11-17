import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserverStub implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (typeof Element !== 'undefined') {
  const elementPrototype = Element.prototype
  if (!elementPrototype.scrollIntoView) {
    elementPrototype.scrollIntoView = () => undefined
  }
  if (!elementPrototype.hasPointerCapture) {
    elementPrototype.hasPointerCapture = () => false
  }
  if (!elementPrototype.setPointerCapture) {
    elementPrototype.setPointerCapture = () => undefined
  }
  if (!elementPrototype.releasePointerCapture) {
    elementPrototype.releasePointerCapture = () => undefined
  }
}

afterEach(() => {
  cleanup()
})
