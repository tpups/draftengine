import fs from 'fs/promises';
import path from 'path';

async function combinePlayerFiles() {
  try {
    // Array to hold all players
    let allPlayers = [];

    // First read top_players_part1.json
    const firstBatchFile = path.join(process.cwd(), 'Data', 'top_players_part1.json');
    const firstBatchData = await fs.readFile(firstBatchFile, 'utf8');
    allPlayers = [...allPlayers, ...JSON.parse(firstBatchData).players];

    // Then read the numbered batch files
    for (let i = 2; i <= 26; i++) {
      const batchFile = path.join(process.cwd(), 'Data', `players_batch_${i}.json`);
      const data = await fs.readFile(batchFile, 'utf8');
      const batchData = JSON.parse(data);
      allPlayers = [...allPlayers, ...batchData.players];
    }

    // Sort players by rank
    allPlayers.sort((a, b) => a.rank.steamer_2025 - b.rank.steamer_2025);

    // Create final players object
    const finalData = {
      players: allPlayers
    };

    // Write combined data to players.json
    await fs.writeFile(
      path.join(process.cwd(), 'Data', 'players.json'),
      JSON.stringify(finalData, null, 2),
      'utf8'
    );

    console.log('Successfully combined all player files into players.json');
    console.log(`Total players: ${allPlayers.length}`);
  } catch (error) {
    console.error('Error combining player files:', error);
  }
}

combinePlayerFiles();
