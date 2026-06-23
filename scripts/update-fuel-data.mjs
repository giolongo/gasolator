import { mkdir, rm, writeFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';

const SOURCES = {
  stations: 'https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv',
  prices: 'https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv'
};
const OUTPUT_DIR = new URL('../public/fuel-data/', import.meta.url);
const FUEL_TYPES = new Map([
  ['benzina', 'petrol'],
  ['gasolio', 'diesel'],
  ['gpl', 'lpg'],
  ['metano', 'methane']
]);

const [stationsCsv, pricesCsv] = await Promise.all([
  download(SOURCES.stations),
  download(SOURCES.prices)
]);
const extractionDate = readExtractionDate(pricesCsv);
const stations = parseMimitCsv(stationsCsv);
const pricesByStation = groupPrices(parseMimitCsv(pricesCsv));
const cells = new Map();

for (const station of stations) {
  const lat = Number(station.Latitudine);
  const lon = Number(station.Longitudine);
  const stationPrices = pricesByStation.get(station.idImpianto);
  const hasValidItalianCoordinates = lat >= 35 && lat <= 48 && lon >= 6 && lon <= 19;
  if (!hasValidItalianCoordinates || !stationPrices?.length) continue;

  const key = gridKey(lat, lon);
  const item = {
    id: station.idImpianto,
    lat,
    lon,
    name: station['Nome Impianto'] || station.Bandiera || 'Distributore',
    brand: station.Bandiera || undefined,
    address: [station.Indirizzo, station.Comune, station.Provincia].filter(Boolean).join(', '),
    prices: stationPrices
  };
  const cell = cells.get(key) ?? [];
  cell.push(item);
  cells.set(key, cell);
}

await rm(OUTPUT_DIR, { recursive: true, force: true });
await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([...cells].map(([key, items]) =>
  writeFile(new URL(`${key}.json`, OUTPUT_DIR), JSON.stringify(items))
));
await writeFile(
  new URL('manifest.json', OUTPUT_DIR),
  JSON.stringify({ updatedAt: extractionDate, gridSize: 0.25, cells: [...cells.keys()].sort() })
);

console.log(`Generated ${cells.size} cells from ${stations.length} stations (${extractionDate}).`);

async function download(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'Gasolator fuel-data updater' } });
  if (!response.ok) throw new Error(`MIMIT download failed (${response.status}): ${url}`);
  return response.text();
}

function parseMimitCsv(content) {
  const firstNewline = content.indexOf('\n');
  return parse(content.slice(firstNewline + 1), {
    columns: true,
    delimiter: '|',
    quote: null,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  });
}

function readExtractionDate(content) {
  const firstLine = content.slice(0, content.indexOf('\n')).trim();
  return firstLine.replace(/^Estrazione del\s+/i, '');
}

function groupPrices(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const type = FUEL_TYPES.get(row.descCarburante?.toLowerCase());
    const price = Number(row.prezzo?.replace(',', '.'));
    if (!type || !Number.isFinite(price)) continue;

    const candidate = {
      type,
      price,
      self: row.isSelf === '1',
      updatedAt: row.dtComu
    };
    const current = grouped.get(row.idImpianto) ?? new Map();
    const existing = current.get(type);
    if (!existing || (candidate.self && !existing.self)) current.set(type, candidate);
    grouped.set(row.idImpianto, current);
  }

  return new Map([...grouped].map(([id, values]) => [id, [...values.values()]]));
}

function gridKey(lat, lon) {
  return `${Math.floor(lat * 4)}_${Math.floor(lon * 4)}`;
}
