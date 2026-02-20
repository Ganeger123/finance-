
import { Transaction } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2023-10-01', type: 'INCOME', category: 'Caméra', subType: 'Inscription', amount: 15000, comment: 'Group A', studentCount: 10 },
  { id: '2', date: '2023-10-02', type: 'EXPENSE', category: 'Électricité', amount: 4500, comment: 'Paiement EDH Octobre' },
  { id: '3', date: '2023-10-05', type: 'INCOME', category: 'Platform', subType: 'Participation', amount: 25000, comment: 'Monthly fees', studentCount: 25 },
  { id: '4', date: '2023-10-10', type: 'EXPENSE', category: 'Fournitures de bureau', amount: 1200, comment: 'Papier et stylos' },
  { id: '5', date: '2023-10-15', type: 'INCOME', category: 'Électricité', subType: 'Participation', amount: 5000, comment: 'Extra charge', studentCount: 2 },
  { id: '6', date: '2023-10-20', type: 'EXPENSE', category: 'Salaire', amount: 150000, comment: 'Staff salaries October' },
  { id: '7', date: '2023-10-25', type: 'EXPENSE', category: 'Maintenance', amount: 8500, comment: 'Air conditioner repair' },
  { id: '8', date: '2023-10-28', type: 'INCOME', category: 'Caméra', subType: 'Participation', amount: 12000, comment: 'Final payment', studentCount: 8 },
];
