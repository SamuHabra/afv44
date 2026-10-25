// Barème des amendes partagé entre la page Mouvements et la saisie pendant les réunions (art. 23)

// Les barèmes d'événements (art. 25) sont dans src/lib/evenements.ts

export const amendeMontants: Record<string, { montant: number; label: string }> = {
  retard: { montant: 500, label: 'Retard (+1h)' },
  bavardage: { montant: 100, label: 'Bavardage' },
  querelle: { montant: 2000, label: 'Querelle/Bagarre' },
  dresscode: { montant: 1000, label: 'Non-respect dress code' },
  cotisation: { montant: 1000, label: 'Échec cotisation' }
};
