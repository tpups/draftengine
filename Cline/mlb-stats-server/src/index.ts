#!/usr/bin/env node
import { Server, ServerConfig, ToolDefinition, ToolResponse, ErrorCode } from './types.js';
import axios from 'axios';

interface MLBPlayer {
  id: number;
  fullName: string;
  primaryPosition: {
    abbreviation: string;
  };
  birthDate: string;
  currentTeam: {
    name: string;
  };
}

class MLBStatsServer {
  private axiosInstance;
  private tools: ToolDefinition[];

  constructor() {
    this.tools = [
      {
        name: 'get_active_players',
        description: 'Get all active MLB players',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];

    this.axiosInstance = axios.create({
      baseURL: 'https://statsapi.mlb.com/api/v1',
      headers: {
        'User-Agent': 'DraftEngine/1.0',
      },
    });
  }

  private async handleRequest(request: any): Promise<ToolResponse> {
    if (request.method === 'listTools') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ tools: this.tools }, null, 2)
        }]
      };
    }

    if (request.method === 'callTool' && request.params?.name === 'get_active_players') {
      try {
        // Get all 40-man roster players
        const response = await this.axiosInstance.get('/sports/1/players', {
          params: {
            season: new Date().getFullYear(),
            gameType: 'R',  // Regular season
          },
        });

        const players = response.data.people
          .filter((player: MLBPlayer) => player.currentTeam) // Only include players with current teams
          .map((player: MLBPlayer) => ({
            name: player.fullName,
            position: [player.primaryPosition.abbreviation],
            mlbTeam: player.currentTeam.name,
            birthDate: player.birthDate,
            level: 'MLB',
            // Initialize other required fields with default values
            rank: {},
            prospectRank: {},
            eta: null,
            prospectRisk: {},
            personalRiskAssessment: '',
            scoutingGrades: {},
            personalGrades: {
              hit: null,
              rawPower: null,
              gamePower: null,
              run: null,
              arm: null,
              field: null,
              fastball: null,
              slider: null,
              curve: null,
              changeup: null,
              control: null,
              command: null
            },
            isDrafted: false,
            draftRound: null,
            draftPick: null,
            draftedBy: null,
            isHighlighted: false,
            notes: null,
            personalRank: null
          }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(players, null, 2),
            },
          ],
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `MLB Stats API error: ${error.response?.data?.message ?? error.message}`,
              },
            ],
          };
        }
        throw error;
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Invalid request' }, null, 2)
      }]
    };
  }

  async run() {
    process.stdin.setEncoding('utf8');
    let buffer = '';

    process.stdin.on('data', async (chunk: string) => {
      buffer += chunk;
      
      if (buffer.includes('\n')) {
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const request = JSON.parse(line);
              const response = await this.handleRequest(request);
              process.stdout.write(JSON.stringify(response) + '\n');
            } catch (error) {
              process.stdout.write(JSON.stringify({ 
                content: [{ 
                  type: 'text', 
                  text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
                }]
              }) + '\n');
            }
          }
        }
      }
    });

    process.stdin.resume();

    process.on('SIGINT', () => {
      process.exit(0);
    });

    console.error('MLB Stats MCP server running on stdio');
  }
}

const server = new MLBStatsServer();
server.run().catch(console.error);
