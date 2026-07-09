// Addresses match the seeded Hardhat accounts (#1-#4) registered on-chain by
// contracts/scripts/deploy.ts, so issuer/recipient addresses are consistent
// between the UI and the chain during the local demo.
export const UNIVERSITIES = [
{
  id: 'u1',
  name: 'Kabarak University',
  type: 'Private',
  role: 'Both',
  address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  joined: '2023-01-15',
  status: 'Online'
},
{
  id: 'u2',
  name: 'Laikipia University',
  type: 'Public',
  role: 'Both',
  address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  joined: '2023-02-20',
  status: 'Online'
},
{
  id: 'u3',
  name: 'Mount Kenya University',
  type: 'Private',
  role: 'Both',
  address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  joined: '2023-03-10',
  status: 'Syncing'
},
{
  id: 'u4',
  name: 'Egerton University',
  type: 'Public',
  role: 'Both',
  address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
  joined: '2023-04-05',
  status: 'Online'
}];


export const PROGRAMS = [
'BSc Computer Science',
'MSc Information Technology',
'BCom Finance',
'BEd Mathematics',
'BSc Nursing',
'BA Economics',
'LLB Law',
'BSc Civil Engineering',
'BA International Relations',
'BSc Agriculture'];


export const STUDENTS = [
{ id: 's1', name: 'Wanjiku Kamau', studentId: 'CS/2019/001', gpa: '3.8' },
{ id: 's2', name: 'Brian Otieno', studentId: 'IT/2020/042', gpa: '3.5' },
{ id: 's3', name: 'Aisha Mohamed', studentId: 'FN/2018/112', gpa: '3.9' },
{
  id: 's4',
  name: 'Kipchoge Cheruiyot',
  studentId: 'ED/2021/088',
  gpa: '3.2'
},
{ id: 's5', name: 'Nanjala Wekesa', studentId: 'NR/2019/055', gpa: '3.6' },
{ id: 's6', name: 'Mwende Mutua', studentId: 'EC/2020/034', gpa: '3.7' },
{ id: 's7', name: 'Hassan Abdi', studentId: 'LW/2018/099', gpa: '3.4' },
{ id: 's8', name: 'Lemayian Sankale', studentId: 'CE/2019/120', gpa: '3.1' },
{ id: 's9', name: 'Achieng Odhiambo', studentId: 'IR/2021/012', gpa: '3.8' },
{ id: 's10', name: 'Wambui Njoroge', studentId: 'AG/2020/076', gpa: '3.5' }];


export const generateHash = () =>
'0x' +
Array.from({ length: 64 }, () =>
Math.floor(Math.random() * 16).toString(16)
).join('');
export const generateTxHash = () =>
'0x' +
Array.from({ length: 64 }, () =>
Math.floor(Math.random() * 16).toString(16)
).join('');

export type RequestStatus =
'Pending' |
'Under Review' |
'Approved' |
'Anchored' |
'Available' |
'Verified' |
'Revoked' |
'Rejected' |
'Tampered';

const now = new Date();
const daysAgo = (days: number) =>
new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

export const REQUESTS = [
{
  id: 'REQ-8821',
  student: STUDENTS[0],
  sourceUni: UNIVERSITIES[0],
  destUni: UNIVERSITIES[1],
  program: PROGRAMS[0],
  submittedAt: daysAgo(45),
  status: 'Verified' as RequestStatus,
  txHash: generateTxHash(),
  blockNumber: 14520192,
  fingerprint: generateHash(),
  issueDate: daysAgo(43),
  history: [
  { stage: 'Requested', timestamp: daysAgo(45) },
  { stage: 'Under Review', timestamp: daysAgo(44) },
  { stage: 'Approved', timestamp: daysAgo(43) },
  { stage: 'Anchored', timestamp: daysAgo(43) },
  { stage: 'Available', timestamp: daysAgo(43) },
  { stage: 'Verified', timestamp: daysAgo(40) }]

},
{
  id: 'REQ-8822',
  student: STUDENTS[1],
  sourceUni: UNIVERSITIES[0],
  destUni: UNIVERSITIES[2],
  program: PROGRAMS[1],
  submittedAt: daysAgo(30),
  status: 'Anchored' as RequestStatus,
  txHash: generateTxHash(),
  blockNumber: 14528991,
  fingerprint: generateHash(),
  issueDate: daysAgo(28),
  history: [
  { stage: 'Requested', timestamp: daysAgo(30) },
  { stage: 'Under Review', timestamp: daysAgo(29) },
  { stage: 'Approved', timestamp: daysAgo(28) },
  { stage: 'Anchored', timestamp: daysAgo(28) },
  { stage: 'Available', timestamp: daysAgo(28) }]

},
{
  id: 'REQ-8823',
  student: STUDENTS[2],
  sourceUni: UNIVERSITIES[0],
  destUni: UNIVERSITIES[3],
  program: PROGRAMS[2],
  submittedAt: daysAgo(15),
  status: 'Under Review' as RequestStatus,
  history: [
  { stage: 'Requested', timestamp: daysAgo(15) },
  { stage: 'Under Review', timestamp: daysAgo(14) }]

},
{
  id: 'REQ-8824',
  student: STUDENTS[3],
  sourceUni: UNIVERSITIES[1],
  destUni: UNIVERSITIES[0],
  program: PROGRAMS[3],
  submittedAt: daysAgo(2),
  status: 'Pending' as RequestStatus,
  history: [{ stage: 'Requested', timestamp: daysAgo(2) }]
},
{
  id: 'REQ-8825',
  student: STUDENTS[4],
  sourceUni: UNIVERSITIES[0],
  destUni: UNIVERSITIES[1],
  program: PROGRAMS[4],
  submittedAt: daysAgo(50),
  status: 'Revoked' as RequestStatus,
  txHash: generateTxHash(),
  blockNumber: 14210055,
  fingerprint: generateHash(),
  issueDate: daysAgo(48),
  history: [
  { stage: 'Requested', timestamp: daysAgo(50) },
  { stage: 'Under Review', timestamp: daysAgo(49) },
  { stage: 'Approved', timestamp: daysAgo(48) },
  { stage: 'Anchored', timestamp: daysAgo(48) },
  { stage: 'Available', timestamp: daysAgo(48) }]

},
{
  id: 'REQ-8826',
  student: STUDENTS[5],
  sourceUni: UNIVERSITIES[2],
  destUni: UNIVERSITIES[0],
  program: PROGRAMS[5],
  submittedAt: daysAgo(10),
  status: 'Approved' as RequestStatus,
  history: [
  { stage: 'Requested', timestamp: daysAgo(10) },
  { stage: 'Under Review', timestamp: daysAgo(9) },
  { stage: 'Approved', timestamp: daysAgo(8) }]

},
{
  id: 'REQ-8827',
  student: STUDENTS[6],
  sourceUni: UNIVERSITIES[3],
  destUni: UNIVERSITIES[1],
  program: PROGRAMS[6],
  submittedAt: daysAgo(60),
  status: 'Verified' as RequestStatus,
  txHash: generateTxHash(),
  blockNumber: 14100200,
  fingerprint: generateHash(),
  issueDate: daysAgo(58),
  history: [
  { stage: 'Requested', timestamp: daysAgo(60) },
  { stage: 'Under Review', timestamp: daysAgo(59) },
  { stage: 'Approved', timestamp: daysAgo(58) },
  { stage: 'Anchored', timestamp: daysAgo(58) },
  { stage: 'Available', timestamp: daysAgo(58) },
  { stage: 'Verified', timestamp: daysAgo(55) }]

},
{
  id: 'REQ-8828',
  student: STUDENTS[7],
  sourceUni: UNIVERSITIES[1],
  destUni: UNIVERSITIES[2],
  program: PROGRAMS[7],
  submittedAt: daysAgo(5),
  status: 'Pending' as RequestStatus,
  history: [{ stage: 'Requested', timestamp: daysAgo(5) }]
},
{
  id: 'REQ-8829',
  student: STUDENTS[8],
  sourceUni: UNIVERSITIES[0],
  destUni: UNIVERSITIES[3],
  program: PROGRAMS[8],
  submittedAt: daysAgo(20),
  status: 'Available' as RequestStatus,
  txHash: generateTxHash(),
  blockNumber: 14450100,
  fingerprint: generateHash(),
  issueDate: daysAgo(18),
  history: [
  { stage: 'Requested', timestamp: daysAgo(20) },
  { stage: 'Under Review', timestamp: daysAgo(19) },
  { stage: 'Approved', timestamp: daysAgo(18) },
  { stage: 'Anchored', timestamp: daysAgo(18) },
  { stage: 'Available', timestamp: daysAgo(18) }]

},
{
  id: 'REQ-8830',
  student: STUDENTS[9],
  sourceUni: UNIVERSITIES[2],
  destUni: UNIVERSITIES[1],
  program: PROGRAMS[9],
  submittedAt: daysAgo(35),
  status: 'Tampered' as RequestStatus,
  txHash: generateTxHash(),
  blockNumber: 14320500,
  fingerprint: generateHash(),
  issueDate: daysAgo(33),
  history: [
  { stage: 'Requested', timestamp: daysAgo(35) },
  { stage: 'Under Review', timestamp: daysAgo(34) },
  { stage: 'Approved', timestamp: daysAgo(33) },
  { stage: 'Anchored', timestamp: daysAgo(33) },
  { stage: 'Available', timestamp: daysAgo(33) }]

},
{
  id: 'REQ-8831',
  student: STUDENTS[0],
  sourceUni: UNIVERSITIES[0],
  destUni: UNIVERSITIES[3],
  program: PROGRAMS[0],
  submittedAt: daysAgo(1),
  status: 'Under Review' as RequestStatus,
  history: [
  { stage: 'Requested', timestamp: daysAgo(1) },
  { stage: 'Under Review', timestamp: daysAgo(0) }]

},
{
  id: 'REQ-8832',
  student: STUDENTS[1],
  sourceUni: UNIVERSITIES[0],
  destUni: UNIVERSITIES[1],
  program: PROGRAMS[1],
  submittedAt: daysAgo(8),
  status: 'Pending' as RequestStatus,
  history: [{ stage: 'Requested', timestamp: daysAgo(8) }]
}];


export const VERIFICATIONS = [
{
  id: 'VER-101',
  date: daysAgo(40),
  transcriptId: 'TR-9921',
  issuer: UNIVERSITIES[0],
  student: STUDENTS[0],
  result: 'Verified',
  txHash: generateTxHash()
},
{
  id: 'VER-102',
  date: daysAgo(33),
  transcriptId: 'TR-9844',
  issuer: UNIVERSITIES[2],
  student: STUDENTS[9],
  result: 'Tampered',
  txHash: generateTxHash()
},
{
  id: 'VER-103',
  date: daysAgo(45),
  transcriptId: 'TR-9712',
  issuer: UNIVERSITIES[0],
  student: STUDENTS[4],
  result: 'Revoked',
  txHash: generateTxHash()
},
{
  id: 'VER-104',
  date: daysAgo(55),
  transcriptId: 'TR-9655',
  issuer: UNIVERSITIES[3],
  student: STUDENTS[6],
  result: 'Verified',
  txHash: generateTxHash()
},
{
  id: 'VER-105',
  date: daysAgo(12),
  transcriptId: 'TR-9500',
  issuer: UNIVERSITIES[1],
  student: STUDENTS[3],
  result: 'Not Found',
  txHash: null
},
{
  id: 'VER-106',
  date: daysAgo(8),
  transcriptId: 'TR-9420',
  issuer: UNIVERSITIES[2],
  student: STUDENTS[5],
  result: 'Verified',
  txHash: generateTxHash()
},
{
  id: 'VER-107',
  date: daysAgo(25),
  transcriptId: 'TR-9311',
  issuer: UNIVERSITIES[0],
  student: STUDENTS[2],
  result: 'Verified',
  txHash: generateTxHash()
},
{
  id: 'VER-108',
  date: daysAgo(3),
  transcriptId: 'TR-9205',
  issuer: UNIVERSITIES[3],
  student: STUDENTS[8],
  result: 'Tampered',
  txHash: generateTxHash()
},
{
  id: 'VER-109',
  date: daysAgo(1),
  transcriptId: 'TR-9110',
  issuer: UNIVERSITIES[1],
  student: STUDENTS[7],
  result: 'Verified',
  txHash: generateTxHash()
},
{
  id: 'VER-110',
  date: daysAgo(0),
  transcriptId: 'TR-9001',
  issuer: UNIVERSITIES[2],
  student: STUDENTS[1],
  result: 'Revoked',
  txHash: generateTxHash()
}];


export const AUDIT_EVENTS = Array.from({ length: 35 }).
map((_, i) => {
  const types = [
  'Issued',
  'Verified',
  'Verification Failed',
  'Revoked',
  'Institution Added',
  'Role Granted',
  'Node Joined',
  'Consensus Round'];

  const type = types[Math.floor(Math.random() * types.length)];
  const actor =
  UNIVERSITIES[Math.floor(Math.random() * UNIVERSITIES.length)].name;
  let target = '';
  if (
  ['Issued', 'Verified', 'Verification Failed', 'Revoked'].includes(type))
  {
    target = `TR-${9000 + i}`;
  } else if (type === 'Institution Added' || type === 'Node Joined') {
    target =
    UNIVERSITIES[Math.floor(Math.random() * UNIVERSITIES.length)].name;
  } else if (type === 'Role Granted') {
    target = `User 0x${Math.floor(Math.random() * 16777215).toString(16)}`;
  } else {
    target = `Block ${14500000 + i}`;
  }

  return {
    id: `EVT-${(i + 1).toString().padStart(3, '0')}`,
    timestamp: daysAgo(Math.floor(Math.random() * 60)),
    type,
    actor: type === 'Institution Added' ? 'Admin' : actor,
    target,
    txHash: generateTxHash()
  };
}).
sort(
  (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
);