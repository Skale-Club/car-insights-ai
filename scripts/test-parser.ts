
import { parseCSV } from '../src/lib/csv-parser';

const csvContent = `PID;UNITS;VALUE;SECONDS;LATITUDE;LONGTITUDE
0c;rpm;800;0.1;42.5;-71.4
0d;km/h;20;0.1;42.5;-71.4
0c;rpm;850;0.2;42.5;-71.4
0d;km/h;21;0.2;42.5;-71.4
`;

const result = parseCSV(csvContent);

console.log('Headers:', result.headers);
console.log('TimeColumn:', result.timeColumn);
console.log('Row Count:', result.rows.length);
if (result.rows.length > 0) {
    console.log('First Row:', JSON.stringify(result.rows[0], null, 2));
}

const pidHeader = result.headers.find(h => h.trim().toUpperCase() === 'PID');
const valueHeader = result.headers.find(h => h.trim().toUpperCase() === 'VALUE');
console.log('PID Header found:', pidHeader);
console.log('VALUE Header found:', valueHeader);
