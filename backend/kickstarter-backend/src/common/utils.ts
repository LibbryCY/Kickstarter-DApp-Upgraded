import * as fs from 'fs';

export async function updateLastProcessedBlock(blockNumber: number) {
  fs.writeFileSync('./src/common/lastBlock.json', JSON.stringify({ lastProcessedBlock: blockNumber }));
}

export function getLastProcessedBlock(): number {
    if (!fs.existsSync('./src/common/lastBlock.json')) return 0;
    const data = JSON.parse(fs.readFileSync('./src/common/lastBlock.json', 'utf-8'));
    return data.lastProcessedBlock || 0;
  }