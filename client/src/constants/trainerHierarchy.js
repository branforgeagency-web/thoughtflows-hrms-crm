// Master Org Hierarchy for Thoughtflows Medical Coding Academy — Training Department
// Head of Training Department -> Training Managers -> Team Leads -> Trainers

export const TRAINER_HIERARCHY = {
  head: {
    id: 'manoj',
    name: 'Manoj',
    role: 'Head of Training Department',
    badge: 'HT',
    zone: 'All Regions (TN, KL, AP / TS)',
    managers: ['keerthi', 'pavithra']
  },
  managers: [
    {
      id: 'keerthi',
      name: 'Keerthi',
      role: 'Training Manager',
      zone: 'TN / KL',
      zoneLabel: 'Tamil Nadu & Kerala',
      badge: 'TM',
      color: '#0D9488',
      teamLeads: ['ram_balaji', 'vaishna']
    },
    {
      id: 'pavithra',
      name: 'Pavithra',
      role: 'Training Manager',
      zone: 'AP / TS',
      zoneLabel: 'Andhra Pradesh & Telangana',
      badge: 'TM',
      color: '#7C3AED',
      teamLeads: ['mounika']
    }
  ],
  teamLeads: [
    {
      id: 'ram_balaji',
      name: 'Ram Balaji',
      role: 'Team Lead',
      zone: 'TN',
      zoneLabel: 'Tamil Nadu',
      managerId: 'keerthi',
      managerName: 'Keerthi',
      badge: 'TL',
      color: '#16A34A',
      trainersCount: 10,
      trainers: [
        { id: 'TR-TN-01', name: 'Tharani shri', course: 'CPC', languages: ['Tamil', 'English'], branch: 'Saravanampatti' },
        { id: 'TR-TN-02', name: 'Jennifer preethi', course: 'CPC', languages: ['Tamil', 'English'], branch: 'Gandhipuram' },
        { id: 'TR-TN-03', name: 'Karkuzhali', course: 'CIC', languages: ['Tamil', 'English'], branch: 'Hopes' },
        { id: 'TR-TN-04', name: 'Sowmiya', course: 'CPB', languages: ['Tamil', 'English'], branch: 'Salem' },
        { id: 'TR-TN-05', name: 'Darsana', course: 'CPC', languages: ['Tamil', 'English'], branch: 'Trichy' },
        { id: 'TR-TN-06', name: 'Sharon', course: 'CPMA', languages: ['Tamil', 'English'], branch: 'Theni' },
        { id: 'TR-TN-07', name: 'Kaviya', course: 'CPC', languages: ['Tamil', 'English'], branch: 'Saravanampatti' },
        { id: 'TR-TN-08', name: 'Priya', course: 'CRC', languages: ['Tamil', 'English'], branch: 'Gandhipuram' },
        { id: 'TR-TN-09', name: 'Sumaiya', course: 'CPC', languages: ['Tamil', 'English'], branch: 'Hopes' },
        { id: 'TR-TN-10', name: 'Sophiga', course: 'CIC', languages: ['Tamil', 'English'], branch: 'Coimbatore' }
      ]
    },
    {
      id: 'vaishna',
      name: 'Vaishna',
      role: 'Team Lead',
      zone: 'KL',
      zoneLabel: 'Kerala',
      managerId: 'keerthi',
      managerName: 'Keerthi',
      badge: 'TL',
      color: '#0284C7',
      trainersCount: 7,
      trainers: [
        { id: 'TR-KL-01', name: 'Aleena', course: 'CPC', languages: ['Malayalam', 'English'], branch: 'Kochi' },
        { id: 'TR-KL-02', name: 'Aswini', course: 'CIC', languages: ['Malayalam', 'English'], branch: 'Trivandrum' },
        { id: 'TR-KL-03', name: 'Shilpa', course: 'CPB', languages: ['Malayalam', 'English'], branch: 'Kochi' },
        { id: 'TR-KL-04', name: 'Varamani', course: 'CPC', languages: ['Malayalam', 'English'], branch: 'Trivandrum' },
        { id: 'TR-KL-05', name: 'Shiny', course: 'CPMA', languages: ['Malayalam', 'English'], branch: 'Kochi' },
        { id: 'TR-KL-06', name: 'Shiva kumar', course: 'CRC', languages: ['Malayalam', 'Tamil', 'English'], branch: 'Trivandrum' },
        { id: 'TR-KL-07', name: 'Abarna', course: 'CPC', languages: ['Malayalam', 'English'], branch: 'Kochi' }
      ]
    },
    {
      id: 'mounika',
      name: 'Mounika',
      role: 'Team Lead',
      zone: 'AP / TS',
      zoneLabel: 'Andhra Pradesh / Telangana',
      managerId: 'pavithra',
      managerName: 'Pavithra',
      badge: 'TL',
      color: '#DB2777',
      trainersCount: 8,
      trainers: [
        { id: 'TR-AP-01', name: 'Pooja', course: 'CPC', languages: ['Telugu', 'English'], branch: 'Ameerpet' },
        { id: 'TR-AP-02', name: 'Varsha', course: 'CIC', languages: ['Telugu', 'English'], branch: 'Dilsukhnagar' },
        { id: 'TR-AP-03', name: 'Charishma', course: 'CPB', languages: ['Telugu', 'English'], branch: 'Tirupati' },
        { id: 'TR-AP-04', name: 'Prasanna', course: 'CPC', languages: ['Telugu', 'English'], branch: 'Vizag' },
        { id: 'TR-AP-05', name: 'Aashifa', course: 'CPMA', languages: ['Telugu', 'English'], branch: 'Ameerpet' },
        { id: 'TR-AP-06', name: 'Santhiya', course: 'CPC', languages: ['Telugu', 'English'], branch: 'Dilsukhnagar' },
        { id: 'TR-AP-07', name: 'Kavitha', course: 'CRC', languages: ['Telugu', 'English'], branch: 'Tirupati' },
        { id: 'TR-AP-08', name: 'Santhosh', course: 'IP-DRG', languages: ['Telugu', 'English'], branch: 'Gandhipuram' }
      ]
    }
  ]
};

// Helper: Get all 25 trainers flattened with their reporting hierarchy
export const ALL_HIERARCHY_TRAINERS = TRAINER_HIERARCHY.teamLeads.flatMap((tl) =>
  tl.trainers.map((t) => ({
    ...t,
    trainerId: t.id,
    trainerName: t.name,
    teamLeadId: tl.id,
    teamLeadName: tl.name,
    managerId: tl.managerId,
    managerName: tl.managerName,
    zone: tl.zone,
    zoneLabel: tl.zoneLabel,
    active: true,
    specialization: t.course,
    expertCourse: t.course,
    branchName: t.branch
  }))
);
