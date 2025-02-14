const positionMap: { [key: string]: { abbr: string, name: string } } = {
  '1': { abbr: 'P', name: 'Pitcher' },
  '2': { abbr: 'C', name: 'Catcher' },
  '3': { abbr: '1B', name: 'First Base' },
  '4': { abbr: '2B', name: 'Second Base' },
  '5': { abbr: '3B', name: 'Third Base' },
  '6': { abbr: 'SS', name: 'Shortstop' },
  '7': { abbr: 'LF', name: 'Left Field' },
  '8': { abbr: 'CF', name: 'Center Field' },
  '9': { abbr: 'RF', name: 'Right Field' },
  '10': { abbr: 'DH', name: 'Designated Hitter' }
};

export const getPositionName = (code: string, useFullName: boolean = false): string => {
  return positionMap[code] ? (useFullName ? positionMap[code].name : positionMap[code].abbr) : code;
};

export const formatPositionStats = (positions: { [key: string]: number }): string => {
  return Object.entries(positions)
    .sort((a, b) => b[1] - a[1]) // Sort by games played descending
    .map(([pos, games]) => `${getPositionName(pos)} ${games}`)
    .join(' | ');
};

export const determineEligiblePositions = (positionStats: { [key: string]: number }, minGames: number): string[] => {
  const positions = new Set<string>();

  // Always add pitcher if they have any pitching appearances
  if (positionStats['1'] && positionStats['1'] > 0) {
    positions.add('P');
  }

  // For position players, check against minimum games threshold
  Object.entries(positionStats).forEach(([pos, games]) => {
    if (pos === '1') return; // Skip pitcher as it's already handled
    if (games >= minGames) {
      switch (pos) {
        case '7':
        case '8':
        case '9':
          positions.add('OF');
          break;
        case '2':
          positions.add('C');
          break;
        case '3':
          positions.add('1B');
          break;
        case '4':
          positions.add('2B');
          break;
        case '5':
          positions.add('3B');
          break;
        case '6':
          positions.add('SS');
          break;
                        // Exclude DH from eligible positions
                        // case '10':
                        //     positions.add('DH');
                        //     break;
      }
    }
  });

  return Array.from(positions).sort();
};
