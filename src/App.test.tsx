import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { diceRng } from './engine/testHelpers.ts'
import { STORAGE_KEY } from './game/session.ts'

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {}
  localStorage.clear()
})
afterEach(cleanup)

function point(n: number): HTMLElement {
  const element = document.querySelector(`[data-point="${n}"]`)
  if (!element) throw new Error(`point ${n} not rendered`)
  return element as HTMLElement
}

describe('App', () => {
  it('shows the start screen with a difficulty selector', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Backgammon AI' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'New Game' })).toBeTruthy()
    expect(screen.getByRole('combobox')).toBeTruthy()
  })

  it('plays a human turn move by move, then hands over to the AI', async () => {
    // Opening: white 3, black 1 -> white moves first with 3-1.
    const rng = diceRng([3, 1])
    render(<App rng={rng} aiDelay={100000} />)
    await userEvent.click(screen.getByRole('button', { name: 'New Game' }))

    expect(screen.getByText(/Opening roll: White 3, Black 1/)).toBeTruthy()
    expect(screen.getByTestId('turn').textContent).toBe('White')
    expect(screen.getByLabelText('Dice 3 1')).toBeTruthy()

    fireEvent.click(point(8))
    expect(point(5).classList.contains('destination')).toBe(true)
    expect(point(7).classList.contains('destination')).toBe(true)
    fireEvent.click(point(5))

    expect(screen.getByLabelText('Dice 1')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(false)

    fireEvent.click(point(6))
    fireEvent.click(point(5))

    expect(screen.getByText('White 3-1: 8/5 6/5')).toBeTruthy()
    expect(screen.getByTestId('turn').textContent).toBe('Black')
    expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true)
  })

  it('undo reverts the turn to its start', async () => {
    const rng = diceRng([3, 1])
    render(<App rng={rng} aiDelay={100000} />)
    await userEvent.click(screen.getByRole('button', { name: 'New Game' }))

    fireEvent.click(point(8))
    fireEvent.click(point(5))
    expect(point(5).getAttribute('aria-label')).toBe('Point 5, 1 white')

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(point(5).getAttribute('aria-label')).toBe('Point 5')
    expect(screen.getByLabelText('Dice 3 1')).toBeTruthy()
  })

  it('runs the AI turn automatically and logs it', async () => {
    vi.useFakeTimers()
    try {
      // Opening: white 1, black 3 -> black first with 3-1; AI then plays.
      const rng = diceRng([1, 3, 4])
      render(<App rng={rng} aiDelay={10} />)
      fireEvent.click(screen.getByRole('button', { name: 'New Game' }))
      expect(screen.getByTestId('turn').textContent).toBe('Black')

      await act(async () => {
        vi.advanceTimersByTime(50)
      })
      expect(screen.getByText(/^Black 3-1: /)).toBeTruthy()
      expect(screen.getByTestId('turn').textContent).toBe('White')
      expect(screen.getByRole('button', { name: 'Roll' }).hasAttribute('disabled')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('persists the game to localStorage and restores it on reload', async () => {
    const rng = diceRng([3, 1])
    const { unmount } = render(<App rng={rng} aiDelay={100000} />)
    await userEvent.click(screen.getByRole('button', { name: 'New Game' }))
    fireEvent.click(point(8))
    fireEvent.click(point(5))
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"turnMoves"')
    unmount()

    render(<App rng={rng} aiDelay={100000} />)
    expect(point(5).getAttribute('aria-label')).toBe('Point 5, 1 white')
    expect(screen.getByLabelText('Dice 1')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(false)
  })

  it('shows the win banner when a game is over', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        difficulty: 'easy',
        state: JSON.stringify({
          points: Array.from({ length: 24 }, (_, i) =>
            i === 0 ? { player: 'black', count: 15 } : { player: null, count: 0 },
          ),
          bar: { white: 0, black: 0 },
          off: { white: 15, black: 0 },
          turn: 'black',
          dice: [],
        }),
        turnStart: JSON.stringify({
          points: Array.from({ length: 24 }, (_, i) =>
            i === 0 ? { player: 'black', count: 15 } : { player: null, count: 0 },
          ),
          bar: { white: 0, black: 0 },
          off: { white: 15, black: 0 },
          turn: 'black',
          dice: [],
        }),
        turnMoves: [],
        log: [],
      }),
    )
    render(<App aiDelay={100000} />)
    expect(screen.getByRole('alert').textContent).toContain('White wins!')
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeTruthy()
  })
})
