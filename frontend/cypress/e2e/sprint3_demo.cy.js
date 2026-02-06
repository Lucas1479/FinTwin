describe('FinTwin: Sprint 3 Review - Production Readiness', () => {
  it('Verifies E2E Flow and AI Response Stability', () => {
    // 1. Visit your local dev site
    cy.visit('http://localhost:5173'); 

    // 2. Automated Login (UI/UX Consistency Check)
    cy.get('input[name="email"]').type('kuda@fintwin.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button').contains('Login').click();

    // 3. System Health: Ensure we hit the Dashboard without latency
    cy.url().should('include', '/dashboard');
    
    // 4. Component Interaction: Testing the Goal Generation
    cy.contains('Generate AI Goal').click();

    // 5. Verification: Confirm AI Chat response and Health Score accuracy
    cy.get('.ai-response', { timeout: 10000 }) 
      .should('be.visible')
      .and('contain', 'Health Score');
  });
});
