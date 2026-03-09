/**
 * Utility to parse sample data from CSV or JSON-like strings
 */
export async function parseDataSample(file: File): Promise<{ headers: string[], sampleData: any[] }> {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim() !== '');

    if (lines.length === 0) return { headers: [], sampleData: [] };

    const headers = lines[0].split(',').map(h => h.trim());
    const sampleData = lines.slice(1, 6).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => {
            obj[h] = values[i]?.trim();
        });
        return obj;
    });

    return { headers, sampleData };
}

export function formatDataForAI(headers: string[], sampleData: any[]): string {
    return `Headers: ${headers.join(', ')}\nSample Data: ${JSON.stringify(sampleData, null, 2)}`;
}
