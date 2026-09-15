import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('App', () => {
  it('renders the heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Backgammon AI' })).toBeTruthy()
  })

  it('increments the counter on click', async () => {
    render(<App />)
    const button = screen.getByRole('button')
    expect(button.textContent).toBe('Count is 0')
    await userEvent.click(button)
    expect(button.textContent).toBe('Count is 1')
  })
})
