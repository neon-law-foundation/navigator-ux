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
    cy.get('[data-testid=walk] input[aria-label=Name]').focus().type('Ada{ctrl+enter}')
    cy.get('input[type=radio][value=nevada]').should('have.focus')
    cy.get('body').type('2')
    cy.get('input[type=radio][value=california]').should('be.checked')
    cy.get('body').type('{ctrl+enter}')
    cy.get('input[type=checkbox][value=nda]').should('have.focus')
    cy.get('body').type('1')
    cy.get('body').type('{ctrl+enter}')
    cy.get('[data-testid=done]').should('have.text', 'Ada|california|nda')
  })
})
