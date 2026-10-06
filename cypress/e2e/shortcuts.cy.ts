describe('keyboard-shortcut overlay', () => {
  beforeEach(() => {
    cy.visit('/shortcuts-demo')
    cy.get('[data-testid=before]').should('be.visible')
  })

  it('opens on ? as a modal, traps Tab, closes on Esc, and returns focus', () => {
    cy.get('[data-testid=before]').focus()
    cy.get('[data-testid=before]').type('?')

    cy.get('dialog[open]')
      .should('be.visible')
      .and(($dialog) => expect($dialog[0]!.matches(':modal')).to.equal(true))
    cy.get('dialog[open]').should('have.attr', 'aria-labelledby')
    cy.get('dialog[open] h2').should('have.text', 'Keyboard shortcuts')
    cy.get('dialog[open]').contains('Count one')
    cy.get('dialog[open]').contains('Show keyboard shortcuts')

    // The page behind a modal dialog is inert: focus cannot be moved onto it.
    cy.get('[data-testid=notes]').then(($notes) => {
      $notes[0]!.focus()
      expect(document.activeElement).not.to.equal($notes[0])
    })

    cy.get('body').type('{esc}')
    cy.get('dialog[open]').should('not.exist')
    cy.get('[data-testid=before]').should('have.focus')
  })

  it('does nothing while focus is in a text field', () => {
    cy.get('[data-testid=notes]').type('?')
    cy.get('dialog[open]').should('not.exist')
    cy.get('[data-testid=notes]').should('have.value', '?')
  })

  it('leaves page shortcuts quiet while the overlay is open', () => {
    cy.get('body').type('n')
    cy.get('[data-testid=count]').should('have.text', '1')
    cy.get('body').type('?')
    cy.get('dialog[open]').should('be.visible')
    cy.get('body').type('n')
    cy.get('[data-testid=count]').should('have.text', '1')
  })

  it('walks a questionnaire to submission with the keyboard alone', () => {
    cy.window().then((win) => {
      const seen: string[] = []
      ;(win as unknown as { receivedKeys: string[] }).receivedKeys = seen
      win.document.addEventListener(
        'keydown',
        (event) => seen.push(`${event.key}:ctrl=${event.ctrlKey}:meta=${event.metaKey}:prevented=${event.defaultPrevented}`),
        true,
      )
    })
    // Let the typed value settle before the shortcut: a Ctrl+Enter fired in the same
    // breath as the last character reaches the Stepper before it has the name, so a
    // slower runner sees the step refuse to advance.
    cy.get('[data-testid=walk] input[aria-label=Name]').focus().type('Ada').should('have.value', 'Ada')
    cy.get('[data-testid=walk] input[aria-label=Name]').type('{ctrl}{enter}')
    cy.wait(1000)
    cy.document().then((doc) => {
      const title = () => doc.querySelector('.nav-stepper__panel:not([hidden]) h2')?.textContent
      if (title() !== 'Your name') return
      doc.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }),
      )
      cy.wait(500).then(() => {
        throw new Error(`real Ctrl+Enter ignored; a synthetic one ${title() === 'Your name' ? 'was ignored too' : 'advanced to ' + title()} | hasFocus=${doc.hasFocus()} | keys=${(doc.defaultView as unknown as { receivedKeys: string[] }).receivedKeys.join(' ')}`)
      })
    })
    cy.document().should((doc) => {
      const step = doc.querySelector('.nav-stepper__panel:not([hidden]) h2')?.textContent
      const active = doc.activeElement?.outerHTML.slice(0, 100)
      const seen = (doc.defaultView as unknown as { receivedKeys: string[] }).receivedKeys.join(' ')
      expect(`${step} | ${active} | hasFocus=${doc.hasFocus()} | ${seen}`).to.match(/Governing law \| <input[^>]*value="nevada"/)
    })
    cy.get('body').type('2')
    cy.get('input[type=radio][value=california]').should('be.checked')
    cy.get('body').type('{ctrl}{enter}')
    cy.get('input[type=checkbox][value=nda]').should('have.focus')
    cy.get('body').type('1')
    cy.get('body').type('{ctrl}{enter}')
    cy.get('[data-testid=done]').should('have.text', 'Ada|california|nda')
  })

  it('moves between pages with g-chords, and only the pages the portal has', () => {
    cy.get('body').type('gn')
    cy.location('hash').should('eq', '#notations')
    cy.get('body').type('gm')
    cy.location('hash').should('eq', '#matters')
    // This portal has no documents page, so g d does nothing.
    cy.get('body').type('gd')
    cy.location('hash').should('eq', '#matters')
    cy.get('body').type('?')
    cy.get('dialog[open]').contains('Go to notations')
    cy.get('dialog[open]').contains('Go to matters')
    cy.get('dialog[open]').should('not.contain', 'Go to documents')
  })

  it('lets a chord lapse after a second and ignores chords in a text field', () => {
    cy.get('body').type('g')
    cy.wait(1200)
    cy.get('body').type('m')
    cy.location('hash').should('eq', '')
    cy.get('[data-testid=notes]').type('gm')
    cy.location('hash').should('eq', '')
    cy.get('[data-testid=notes]').should('have.value', 'gm')
  })
})
