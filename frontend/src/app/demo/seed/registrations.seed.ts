import { Registration, RegistrationStatus } from '../../core/api/registry.models';
import { daysAgo } from '../demo-http';

/** A municipality exactly as the Comuni-ITA snapshot describes it. */
interface Place {
  istat: string;
  name: string;
  cadastral: string;
  cap: string;
  code: string;
  province: string;
  region: string;
}

const place = (istat: string, name: string, cadastral: string, cap: string, code: string, province: string, region: string): Place =>
  ({ istat, name, cadastral, cap, code, province, region });

const VARESE = place('012133', 'Varese', 'L682', '21100', 'VA', 'Varese', 'Lombardia');
const MILANO = place('015146', 'Milano', 'F205', '20121', 'MI', 'Milano', 'Lombardia');
const MONZA = place('108033', 'Monza', 'F704', '20900', 'MB', 'Monza e della Brianza', 'Lombardia');
const MANTOVA = place('020030', 'Mantova', 'E897', '46100', 'MN', 'Mantova', 'Lombardia');
const BERGAMO = place('016024', 'Bergamo', 'A794', '24129', 'BG', 'Bergamo', 'Lombardia');
const TREMEZZINA = place('013252', 'Tremezzina', 'M341', '22016', 'CO', 'Como', 'Lombardia');
const TORINO = place('001272', 'Torino', 'L219', '10123', 'TO', 'Torino', 'Piemonte');
const VENARIA = place('001292', 'Venaria Reale', 'L727', '10078', 'TO', 'Torino', 'Piemonte');
const VENEZIA = place('027042', 'Venezia', 'L736', '30124', 'VE', 'Venezia', 'Veneto');
const VERONA = place('023091', 'Verona', 'L781', '37121', 'VR', 'Verona', 'Veneto');
const PADOVA = place('028060', 'Padova', 'G224', '35121', 'PD', 'Padova', 'Veneto');
const VICENZA = place('024116', 'Vicenza', 'L840', '36100', 'VI', 'Vicenza', 'Veneto');
const GENOVA = place('010025', 'Genova', 'D969', '16123', 'GE', 'Genova', 'Liguria');
const RAVENNA = place('039014', 'Ravenna', 'H199', '48121', 'RA', 'Ravenna', 'Emilia Romagna');
const BOLOGNA = place('037006', 'Bologna', 'A944', '40124', 'BO', 'Bologna', 'Emilia Romagna');
const MODENA = place('036023', 'Modena', 'F257', '41121', 'MO', 'Modena', 'Emilia Romagna');
const FIRENZE = place('048017', 'Firenze', 'D612', '50122', 'FI', 'Firenze', 'Toscana');
const PISA = place('050026', 'Pisa', 'G702', '56126', 'PI', 'Pisa', 'Toscana');
const SIENA = place('052032', 'Siena', 'I726', '53100', 'SI', 'Siena', 'Toscana');
const ASSISI = place('054001', 'Assisi', 'A475', '06081', 'PG', 'Perugia', 'Umbria');
const URBINO = place('041067', 'Urbino', 'L500', '61029', 'PU', 'Pesaro e Urbino', 'Marche');
const ROMA = place('058091', 'Roma', 'H501', '00184', 'RM', 'Roma', 'Lazio');
const TIVOLI = place('058104', 'Tivoli', 'L182', '00019', 'RM', 'Roma', 'Lazio');
const CASERTA = place('061022', 'Caserta', 'B963', '81100', 'CE', 'Caserta', 'Campania');
const NAPOLI = place('063049', 'Napoli', 'F839', '80132', 'NA', 'Napoli', 'Campania');
const POMPEI = place('063058', 'Pompei', 'G813', '80045', 'NA', 'Napoli', 'Campania');
const ANDRIA = place('110001', 'Andria', 'A285', '76123', 'BT', 'Barletta-Andria-Trani', 'Puglia');
const BARI = place('072006', 'Bari', 'A662', '70122', 'BA', 'Bari', 'Puglia');
const MATERA = place('077014', 'Matera', 'F052', '75100', 'MT', 'Matera', 'Basilicata');
const REGGIO = place('080063', 'Reggio di Calabria', 'H224', '89123', 'RC', 'Reggio Calabria', 'Calabria');
const AGRIGENTO = place('084001', 'Agrigento', 'A089', '92100', 'AG', 'Agrigento', 'Sicilia');
const MONREALE = place('082049', 'Monreale', 'F377', '90046', 'PA', 'Palermo', 'Sicilia');
const PALERMO = place('082053', 'Palermo', 'G273', '90138', 'PA', 'Palermo', 'Sicilia');
const BARUMINI = place('117002', 'Barumini', 'A681', '09021', 'VS', 'Medio Campidano', 'Sardegna');
const TRENTO = place('022205', 'Trento', 'L378', '38122', 'TN', 'Trento', 'Trentino Alto Adige');
const TRIESTE = place('032006', 'Trieste', 'L424', '34151', 'TS', 'Trieste', 'Friuli Venezia Giulia');
const BARD = place('007009', 'Bard', 'A643', '11020', 'AO', "Valle d'Aosta", "Valle d'Aosta");
const AQUILA = place('066049', "L'Aquila", 'A345', '67100', 'AQ', "L'Aquila", 'Abruzzo');
const VENAFRO = place('094052', 'Venafro', 'L725', '86079', 'IS', 'Isernia', 'Molise');

interface Asset {
  name: string;
  at: Place;
  street: string;
  number?: string;
  lat: number;
  lng: number;
  constraint: string;
  ownership: string;
  body: string;
  billing: string;
  status: RegistrationStatus;
  by: string;
  age: number;
  note?: string;
}

const MONUMENTAL = 'Monumental — D.Lgs. 42/2004, art. 10';
const ARCHAEOLOGICAL = 'Archaeological — D.Lgs. 42/2004, art. 10';
const LANDSCAPE = 'Landscape — D.Lgs. 42/2004, art. 136';
const UNESCO = 'UNESCO World Heritage site';

const GIULIA = 'giulia.rossi@bimap.local';
const LUCA = 'luca.conti@bimap.local';
const DAVIDE = 'davide.greco@bimap.local';
const CHIARA = 'chiara.romano@example.com';
const SIMONE = 'simone.costa@bimap.local';
const LAURA = 'laura.fontana@bimap.local';

const ASSETS: Asset[] = [
  { name: 'Palazzo Estense', at: VARESE, street: 'Via Sacco', number: '5', lat: 45.81734, lng: 8.82298, constraint: MONUMENTAL, ownership: 'Municipal property', body: 'Comune di Varese', billing: 'UF3KQ8', status: 'VERIFIED', by: GIULIA, age: 96 },
  { name: 'Villa e Collezione Panza', at: VARESE, street: 'Piazza Litta', number: '1', lat: 45.82713, lng: 8.82852, constraint: MONUMENTAL, ownership: 'Private — FAI foundation', body: 'Comune di Varese', billing: 'UF3KQ8', status: 'VERIFIED', by: GIULIA, age: 88 },
  { name: 'Sacro Monte di Varese — Via Sacra', at: VARESE, street: 'Piazzale Pogliaghi', lat: 45.85961, lng: 8.79052, constraint: UNESCO, ownership: 'Ecclesiastical', body: 'Comune di Varese', billing: 'UF3KQ8', status: 'SUBMITTED', by: GIULIA, age: 4 },
  { name: 'Castello Sforzesco', at: MILANO, street: 'Piazza Castello', lat: 45.47049, lng: 9.17935, constraint: MONUMENTAL, ownership: 'Municipal property', body: 'Comune di Milano', billing: 'UF7MHC', status: 'VERIFIED', by: LUCA, age: 120 },
  { name: 'Palazzo di Brera', at: MILANO, street: 'Via Brera', number: '28', lat: 45.47196, lng: 9.18793, constraint: MONUMENTAL, ownership: 'State property', body: 'Pinacoteca di Brera', billing: 'D4YPLR', status: 'VERIFIED', by: LUCA, age: 112 },
  { name: "Basilica di Sant'Ambrogio", at: { ...MILANO, cap: '20123' }, street: "Piazza Sant'Ambrogio", number: '15', lat: 45.46229, lng: 9.17567, constraint: MONUMENTAL, ownership: 'Ecclesiastical', body: 'Comune di Milano', billing: 'UF7MHC', status: 'SUBMITTED', by: DAVIDE, age: 3 },
  { name: 'Villa Reale di Monza', at: MONZA, street: 'Viale Brianza', number: '1', lat: 45.59265, lng: 9.27348, constraint: MONUMENTAL, ownership: 'Consortium Villa Reale e Parco di Monza', body: 'Comune di Monza', billing: 'UFL9D2', status: 'VERIFIED', by: DAVIDE, age: 74 },
  { name: 'Palazzo Te', at: MANTOVA, street: 'Viale Te', number: '13', lat: 45.14759, lng: 10.78700, constraint: UNESCO, ownership: 'Municipal property', body: 'Comune di Mantova', billing: 'UF2XWN', status: 'VERIFIED', by: SIMONE, age: 66 },
  { name: 'Palazzo della Ragione', at: BERGAMO, street: 'Piazza Vecchia', number: '8', lat: 45.70373, lng: 9.66284, constraint: MONUMENTAL, ownership: 'Municipal property', body: 'Comune di Bergamo', billing: 'UF8R3T', status: 'DRAFT', by: GIULIA, age: 1 },
  { name: 'Villa Carlotta', at: TREMEZZINA, street: 'Via Regina', number: '2', lat: 45.98640, lng: 9.22972, constraint: LANDSCAPE, ownership: 'Ente Villa Carlotta', body: 'Comune di Tremezzina', billing: 'UFB6YA', status: 'REJECTED', by: GIULIA, age: 12, note: 'The cadastral reference points at the botanical garden parcel, not the villa. Check sheet 7 again.' },
  { name: 'Mole Antonelliana', at: TORINO, street: 'Via Montebello', number: '20', lat: 45.06904, lng: 7.69330, constraint: MONUMENTAL, ownership: 'Municipal property', body: 'Comune di Torino', billing: 'UFE0V1', status: 'VERIFIED', by: LAURA, age: 140 },
  { name: 'Palazzo Madama', at: TORINO, street: 'Piazza Castello', lat: 45.07122, lng: 7.68581, constraint: UNESCO, ownership: 'Municipal property', body: 'Comune di Torino', billing: 'UFE0V1', status: 'VERIFIED', by: LAURA, age: 133 },
  { name: 'Reggia di Venaria Reale', at: VENARIA, street: 'Piazza della Repubblica', number: '4', lat: 45.13519, lng: 7.61950, constraint: UNESCO, ownership: 'Consortium La Venaria Reale', body: 'Comune di Venaria Reale', billing: 'UFKW41', status: 'SUBMITTED', by: LAURA, age: 6 },
  { name: 'Palazzo Ducale', at: VENEZIA, street: 'Piazza San Marco', number: '1', lat: 45.43373, lng: 12.34040, constraint: UNESCO, ownership: 'Municipal property', body: 'Comune di Venezia', billing: 'UF1P7C', status: 'VERIFIED', by: SIMONE, age: 150 },
  { name: 'Arena di Verona', at: VERONA, street: 'Piazza Bra', number: '1', lat: 45.43902, lng: 10.99435, constraint: ARCHAEOLOGICAL, ownership: 'Municipal property', body: 'Comune di Verona', billing: 'UFQ5Z8', status: 'VERIFIED', by: SIMONE, age: 101 },
  { name: 'Cappella degli Scrovegni', at: PADOVA, street: 'Piazza Eremitani', number: '8', lat: 45.41180, lng: 11.87975, constraint: UNESCO, ownership: 'Municipal property', body: 'Comune di Padova', billing: 'UFH2M6', status: 'VERIFIED', by: CHIARA, age: 58 },
  { name: 'Villa Almerico Capra "La Rotonda"', at: VICENZA, street: 'Via della Rotonda', number: '45', lat: 45.53148, lng: 11.56003, constraint: UNESCO, ownership: 'Private', body: 'Comune di Vicenza', billing: 'UF4J9E', status: 'SUBMITTED', by: CHIARA, age: 2 },
  { name: 'Palazzo Ducale', at: GENOVA, street: 'Piazza Giacomo Matteotti', number: '9', lat: 44.40731, lng: 8.93372, constraint: MONUMENTAL, ownership: 'Municipal property', body: 'Comune di Genova', billing: 'UFP8K0', status: 'VERIFIED', by: DAVIDE, age: 81 },
  { name: 'Basilica di San Vitale', at: RAVENNA, street: 'Via San Vitale', number: '17', lat: 44.42041, lng: 12.19660, constraint: UNESCO, ownership: 'Ecclesiastical', body: 'Comune di Ravenna', billing: 'UFT3W7', status: 'VERIFIED', by: LUCA, age: 70 },
  { name: "Archiginnasio", at: BOLOGNA, street: 'Piazza Galvani', number: '1', lat: 44.49268, lng: 11.34318, constraint: MONUMENTAL, ownership: 'Municipal property', body: 'Comune di Bologna', billing: 'UF5N2D', status: 'VERIFIED', by: LUCA, age: 64 },
  { name: 'Duomo di Modena', at: MODENA, street: 'Corso Duomo', lat: 44.64612, lng: 10.92543, constraint: UNESCO, ownership: 'Ecclesiastical', body: 'Comune di Modena', billing: 'UFZ6H4', status: 'DRAFT', by: LUCA, age: 0 },
  { name: 'Galleria degli Uffizi', at: FIRENZE, street: 'Piazzale degli Uffizi', number: '6', lat: 43.76779, lng: 11.25530, constraint: UNESCO, ownership: 'State property', body: 'Gallerie degli Uffizi', billing: 'L9U2RB', status: 'VERIFIED', by: GIULIA, age: 180 },
  { name: 'Ponte Vecchio', at: FIRENZE, street: 'Ponte Vecchio', lat: 43.76796, lng: 11.25313, constraint: UNESCO, ownership: 'Municipal property', body: 'Comune di Firenze', billing: 'UFM7C3', status: 'ARCHIVED', by: GIULIA, age: 210 },
  { name: 'Torre pendente di Pisa', at: PISA, street: 'Piazza del Duomo', lat: 43.72296, lng: 10.39659, constraint: UNESCO, ownership: 'Opera della Primaziale Pisana', body: 'Comune di Pisa', billing: 'UFJ1T9', status: 'VERIFIED', by: CHIARA, age: 45 },
  { name: 'Palazzo Pubblico', at: SIENA, street: 'Piazza del Campo', number: '1', lat: 43.31808, lng: 11.33193, constraint: UNESCO, ownership: 'Municipal property', body: 'Comune di Siena', billing: 'UFX4P5', status: 'SUBMITTED', by: SIMONE, age: 5 },
  { name: 'Basilica di San Francesco', at: ASSISI, street: 'Piazza Inferiore di San Francesco', number: '2', lat: 43.07482, lng: 12.60550, constraint: UNESCO, ownership: 'Ecclesiastical', body: 'Comune di Assisi', billing: 'UFC8L1', status: 'VERIFIED', by: DAVIDE, age: 52 },
  { name: 'Palazzo Ducale', at: URBINO, street: 'Piazza Rinascimento', number: '13', lat: 43.72430, lng: 12.63710, constraint: UNESCO, ownership: 'State property', body: 'Galleria Nazionale delle Marche', billing: 'S2R8NQ', status: 'REJECTED', by: DAVIDE, age: 9, note: 'Two registrations exist for the same palace. Merge this one into the verified record.' },
  { name: 'Anfiteatro Flavio (Colosseo)', at: ROMA, street: 'Piazza del Colosseo', lat: 41.89021, lng: 12.49223, constraint: UNESCO, ownership: 'State property', body: 'Parco archeologico del Colosseo', billing: 'M6VQ2Z', status: 'VERIFIED', by: LAURA, age: 190 },
  { name: 'Pantheon', at: { ...ROMA, cap: '00186' }, street: 'Piazza della Rotonda', lat: 41.89861, lng: 12.47687, constraint: UNESCO, ownership: 'State property', body: 'Direzione Musei nazionali della città di Roma', billing: 'K3PD7T', status: 'VERIFIED', by: LAURA, age: 160 },
  { name: "Villa d'Este", at: TIVOLI, street: 'Piazza Trento', number: '5', lat: 41.96275, lng: 12.79631, constraint: UNESCO, ownership: 'State property', body: 'Istituto Villa Adriana e Villa d’Este', billing: 'Q1BX9H', status: 'SUBMITTED', by: LAURA, age: 7 },
  { name: 'Reggia di Caserta', at: CASERTA, street: 'Viale Douhet', number: '2/a', lat: 41.07334, lng: 14.32700, constraint: UNESCO, ownership: 'State property', body: 'Reggia di Caserta', billing: 'W5HJ2P', status: 'VERIFIED', by: SIMONE, age: 118 },
  { name: "Castel dell'Ovo", at: NAPOLI, street: 'Via Eldorado', number: '3', lat: 40.82858, lng: 14.24766, constraint: MONUMENTAL, ownership: 'Municipal property', body: 'Comune di Napoli', billing: 'UFN3S6', status: 'DRAFT', by: CHIARA, age: 2 },
  { name: 'Parco archeologico di Pompei', at: POMPEI, street: 'Via Villa dei Misteri', number: '2', lat: 40.74896, lng: 14.48487, constraint: ARCHAEOLOGICAL, ownership: 'State property', body: 'Parco archeologico di Pompei', billing: 'T8C4MV', status: 'VERIFIED', by: CHIARA, age: 75 },
  { name: 'Castel del Monte', at: ANDRIA, street: 'Strada Statale 170', lat: 41.08481, lng: 16.27106, constraint: UNESCO, ownership: 'State property', body: 'Direzione regionale Musei Puglia', billing: 'H7N1XC', status: 'VERIFIED', by: DAVIDE, age: 60 },
  { name: 'Basilica di San Nicola', at: BARI, street: 'Largo Abate Elia', number: '13', lat: 41.13018, lng: 16.87012, constraint: MONUMENTAL, ownership: 'Ecclesiastical', body: 'Comune di Bari', billing: 'UFR2A8', status: 'SUBMITTED', by: DAVIDE, age: 1 },
  { name: 'Casa Noha — Sassi di Matera', at: MATERA, street: 'Recinto Cavone', number: '9', lat: 40.66678, lng: 16.61062, constraint: UNESCO, ownership: 'Private — FAI foundation', body: 'Comune di Matera', billing: 'UFD5K7', status: 'VERIFIED', by: GIULIA, age: 40 },
  { name: 'Museo Archeologico Nazionale', at: REGGIO, street: 'Piazza Giuseppe De Nava', number: '26', lat: 38.11283, lng: 15.64838, constraint: MONUMENTAL, ownership: 'State property', body: 'Museo Archeologico Nazionale di Reggio Calabria', billing: 'P4ZK8W', status: 'VERIFIED', by: SIMONE, age: 33 },
  { name: 'Tempio della Concordia', at: AGRIGENTO, street: 'Via Panoramica Valle dei Templi', lat: 37.29081, lng: 13.59229, constraint: UNESCO, ownership: 'Regional property', body: 'Parco archeologico Valle dei Templi', billing: 'R9E3BN', status: 'VERIFIED', by: LUCA, age: 90 },
  { name: 'Duomo di Monreale', at: MONREALE, street: 'Piazza Guglielmo II', number: '1', lat: 38.08162, lng: 13.29230, constraint: UNESCO, ownership: 'Ecclesiastical', body: 'Comune di Monreale', billing: 'UFG6T2', status: 'REJECTED', by: LUCA, age: 15, note: 'Photographs are missing for the cloister. Add them before resubmitting.' },
  { name: 'Teatro Massimo', at: PALERMO, street: 'Piazza Verdi', lat: 38.12034, lng: 13.35713, constraint: MONUMENTAL, ownership: 'Municipal property', body: 'Comune di Palermo', billing: 'UFV1Q4', status: 'VERIFIED', by: LUCA, age: 27 },
  { name: 'Su Nuraxi di Barumini', at: BARUMINI, street: 'Viale Su Nuraxi', lat: 39.70580, lng: 8.99053, constraint: UNESCO, ownership: 'Municipal property', body: 'Comune di Barumini', billing: 'UFS9W3', status: 'VERIFIED', by: CHIARA, age: 22 },
  { name: 'Castello del Buonconsiglio', at: TRENTO, street: 'Via Bernardo Clesio', number: '5', lat: 46.07119, lng: 11.12654, constraint: MONUMENTAL, ownership: 'Autonomous Province of Trento', body: 'Comune di Trento', billing: 'UFW8E5', status: 'SUBMITTED', by: SIMONE, age: 3 },
  { name: 'Castello di Miramare', at: TRIESTE, street: 'Viale Miramare', lat: 45.70260, lng: 13.71237, constraint: MONUMENTAL, ownership: 'State property', body: 'Museo storico e il Parco del Castello di Miramare', billing: 'N2HV6Y', status: 'VERIFIED', by: GIULIA, age: 19 },
  { name: 'Forte di Bard', at: BARD, street: 'Via Vittorio Emanuele II', lat: 45.60926, lng: 7.74407, constraint: MONUMENTAL, ownership: 'Regional property', body: 'Comune di Bard', billing: 'UFY4R1', status: 'DRAFT', by: GIULIA, age: 0 },
  { name: 'Basilica di Santa Maria di Collemaggio', at: AQUILA, street: 'Piazzale di Collemaggio', lat: 42.34403, lng: 13.40363, constraint: MONUMENTAL, ownership: 'Ecclesiastical', body: "Comune di L'Aquila", billing: 'UFA7G9', status: 'ARCHIVED', by: DAVIDE, age: 230 },
  { name: 'Castello Pandone', at: VENAFRO, street: 'Piazza Castello', lat: 41.48532, lng: 14.04312, constraint: MONUMENTAL, ownership: 'State property', body: 'Direzione regionale Musei Molise', billing: 'J6LS3F', status: 'SUBMITTED', by: LAURA, age: 8 },
];

/** Deterministic cadastral sheet and parcel, so every reset shows the same references. */
function cadastralReference(index: number): string {
  return `Sheet ${(index * 7) % 48 + 1}, parcel ${(index * 131) % 900 + 12}`;
}

export function seedRegistrations(): Registration[] {
  return ASSETS.map((asset, index) => {
    const created = daysAgo(asset.age + 1, 8 + (index % 8), (index * 11) % 60);
    const submitted = asset.status === 'DRAFT' ? undefined : daysAgo(asset.age, 16, (index * 3) % 60);
    const reviewed =
      asset.status === 'VERIFIED' || asset.status === 'REJECTED' || asset.status === 'ARCHIVED'
        ? daysAgo(Math.max(asset.age - 2, 0), 11, (index * 17) % 60)
        : undefined;
    const fullAddress = asset.number ? `${asset.street} ${asset.number}` : asset.street;

    return {
      id: `${(0x4a3b0000 + index).toString(16)}-2c1d-4e5f-8a9b-${(index + 1).toString().padStart(12, '0')}`,
      region: asset.at.region,
      provinceName: asset.at.province,
      provinceCode: asset.at.code,
      municipality: asset.at.name,
      istatCode: asset.at.istat,
      cadastralCode: asset.at.cadastral,
      postalCode: asset.at.cap,
      address: asset.street,
      houseNumber: asset.number,
      fullAddress,
      latitude: asset.lat,
      longitude: asset.lng,
      assetName: asset.name,
      assetReference: `${asset.at.code}-${String(1200 + index * 37).padStart(5, '0')}`,
      entityName: asset.body,
      entityBillingCode: asset.billing,
      ownership: asset.ownership,
      protectionMeasure: `Ministerial decree of ${1902 + ((index * 13) % 110)}`,
      constraintType: asset.constraint,
      cadastralReference: cadastralReference(index),
      transcription: `Transcribed ${String(((index * 5) % 27) + 1).padStart(2, '0')}/0${(index % 9) + 1}/${1905 + ((index * 17) % 100)}, no. ${800 + index * 23}`,
      notes: asset.status === 'DRAFT' ? 'Façade survey done; interior access pending.' : undefined,
      status: asset.status,
      reviewNote: asset.note,
      submittedAt: submitted,
      reviewedAt: reviewed,
      reviewedBy: reviewed ? (index % 2 === 0 ? 'marco.bianchi@bimap.local' : 'sara.colombo@bimap.local') : undefined,
      createdBy: asset.by,
      createdAt: created,
      updatedAt: reviewed ?? submitted ?? created,
    };
  });
}
