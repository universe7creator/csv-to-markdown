module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { csv, delimiter = ',', hasHeader = true, align = 'left' } = req.body;

    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'CSV data is required' });
    }

    // Parse CSV with proper quote handling
    const lines = csv.trim().split('\n');
    if (lines.length === 0) {
      return res.status(400).json({ error: 'Empty CSV data' });
    }

    const rows = lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows found' });
    }

    const colCount = Math.max(...rows.map(r => r.length));
    const widths = [];
    for (let i = 0; i < colCount; i++) {
      widths.push(Math.max(...rows.map(r => (r[i] || '').length), 3));
    }

    const padCell = (cell, width) => {
      cell = cell || '';
      if (align === 'center') {
        const left = Math.floor((width - cell.length) / 2);
        const right = width - cell.length - left;
        return ' '.repeat(Math.max(0, left)) + cell + ' '.repeat(Math.max(0, right));
      } else if (align === 'right') {
        return cell.padStart(width);
      }
      return cell.padEnd(width);
    };

    const formatRow = (row) => '| ' + row.map((cell, i) => padCell(cell, widths[i])).join(' | ') + ' |';

    let markdown = formatRow(rows[0]) + '\n';
    markdown += '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |\n';

    for (let i = 1; i < rows.length; i++) {
      markdown += formatRow(rows[i]) + '\n';
    }

    return res.status(200).json({
      markdown,
      rows: rows.length,
      columns: colCount
    });

  } catch (error) {
    return res.status(500).json({ error: 'Conversion failed: ' + error.message });
  }
};
