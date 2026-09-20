import type { Role } from '@secureshelf/shared';

// Fictional Marvels staff (proposal §7: no real names, NICs or phone numbers). Every account
// uses the same demo password so the presenter never has to remember seven of them.
export const DEMO_PASSWORD = 'Marvels-Demo-2026!';

export type SeedUser = {
  email: string;
  fullName: string;
  role: Role;
  jobTitle: string;
  nic: string;
  phone: string;
  contact: string;
};

export const seedUsers: SeedUser[] = [
  { email: 'owner@marvels.example', fullName: 'Nimal Perera', role: 'owner', jobTitle: 'Proprietor', nic: '197512345678', phone: '0771000001', contact: '12 Galle Road, Colombo 03' },
  { email: 'secadmin@marvels.example', fullName: 'Ishara Fernando', role: 'security_admin', jobTitle: 'Security Administrator', nic: '199023456789', phone: '0771000002', contact: '45 Station Road, Dehiwala' },
  { email: 'manager@marvels.example', fullName: 'Ruwan Jayasinghe', role: 'manager', jobTitle: 'Floor Manager', nic: '198534567890', phone: '0771000003', contact: '8 Temple Lane, Nugegoda' },
  { email: 'cashier1@marvels.example', fullName: 'Dilani Silva', role: 'cashier', jobTitle: 'Cashier', nic: '199845678901', phone: '0771000004', contact: '23 Lake Drive, Rajagiriya' },
  { email: 'cashier2@marvels.example', fullName: 'Kasun Bandara', role: 'cashier', jobTitle: 'Cashier', nic: '200056789012', phone: '0771000005', contact: '67 Hill Street, Mount Lavinia' },
  { email: 'stock1@marvels.example', fullName: 'Tharindu Wijesinghe', role: 'stock_staff', jobTitle: 'Stock Assistant', nic: '199767890123', phone: '0771000006', contact: '90 Park Avenue, Maharagama' },
  { email: 'stock2@marvels.example', fullName: 'Sachini Rathnayake', role: 'stock_staff', jobTitle: 'Stock Assistant', nic: '200178901234', phone: '0771000007', contact: '31 Canal Road, Kotte' },
];
