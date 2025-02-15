using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;

namespace DraftEngine.Models.Data
{
    public enum ProjectionType
    {
        Hitter,
        Pitcher
    }

    public class CsvPlayerImport
    {
        public string DataSource { get; set; } = null!;
        public DateTime ImportDate { get; set; }
        public string DataType { get; set; } = null!; // "projections", "rankings", "prospects"
        public int PlayerCount { get; set; }
        public ProjectionType? ProjectionType { get; set; }

        public class CsvPlayerRecord
        {
            public string? Name { get; set; }
            public string? Team { get; set; }
            public string? PlayerId { get; set; }  // FanGraphs ID
            public string? MLBAMID { get; set; } // MLBAM ID
            public int? RANK { get; set; }  // For rankings imports
            public string? POS { get; set; }  // For rankings/prospects imports
            
            // Hitter Projections
            public double? HR { get; set; }
            public double? R { get; set; }
            public double? RBI { get; set; }
            public double? SB { get; set; }
            public double? AVG { get; set; }
            public double? OPS { get; set; }
            public double? wRCPlus { get; set; }  // wRC+
            public double? ISO { get; set; }  // ISO

            // Pitcher Core Stats
            public double? IP { get; set; }    // Innings Pitched
            public double? ERA { get; set; }    // Earned Run Average
            public double? WHIP { get; set; }   // Walks + Hits per IP
            public double? GS { get; set; }     // Games Started
            public double? SV { get; set; }     // Saves
            public double? QS { get; set; }     // Quality Starts

            // Pitcher Rate Stats
            public double? GBPercent { get; set; }  // GB%
            public double? KPer9 { get; set; }  // K/9
            public double? BBPer9 { get; set; }  // BB/9
            public double? HRPer9 { get; set; }  // HR/9

            // Shared Projections
            public double? WAR { get; set; }  // Shared between hitters and pitchers
            public double? G { get; set; }
            public double? KPercent { get; set; }  // K%
            public double? BBPercent { get; set; }  // BB%
            public double? ADP { get; set; }  // ADP
            public double? SO { get; set; }
            public double? BB { get; set; }
        }

        public class CsvPlayerRecordMap : ClassMap<CsvPlayerRecord>
        {
            public CsvPlayerRecordMap()
            {
                Map(m => m.Name).Name("Name");
                Map(m => m.Team).Name("Team");
                Map(m => m.PlayerId).Name("PlayerId");
                Map(m => m.MLBAMID).Name("MLBAMID");
                Map(m => m.RANK).Name("RANK");
                Map(m => m.POS).Name("POS");
                
                // Hitter Projections
                Map(m => m.HR).Name("HR");
                Map(m => m.R).Name("R");
                Map(m => m.RBI).Name("RBI");
                Map(m => m.SB).Name("SB");
                Map(m => m.AVG).Name("AVG");
                Map(m => m.OPS).Name("OPS");
                Map(m => m.wRCPlus).Name("wRC+");
                Map(m => m.ISO).Name("ISO");

                // Pitcher Projections
                Map(m => m.IP).Name("IP");
                Map(m => m.SV).Name("SV");
                Map(m => m.QS).Name("QS");
                Map(m => m.ERA).Name("ERA");
                Map(m => m.WHIP).Name("WHIP");
                Map(m => m.GS).Name("GS");
                Map(m => m.GBPercent).Name("GB%");
                Map(m => m.KPer9).Name("K/9");
                Map(m => m.BBPer9).Name("BB/9");
                Map(m => m.HRPer9).Name("HR/9");

                // Shared Projections
                Map(m => m.WAR).Name("WAR");
                Map(m => m.G).Name("G");
                Map(m => m.KPercent).Name("K%");
                Map(m => m.BBPercent).Name("BB%");
                Map(m => m.ADP).Name("ADP");
                Map(m => m.SO).Name("SO");
                Map(m => m.BB).Name("BB");
            }
        }

        public class IbwRankingsMap : ClassMap<CsvPlayerRecord>
        {
            public IbwRankingsMap()
            {
                Map(m => m.Name).Name("NAME");
                Map(m => m.Team).Name("TM");
                Map(m => m.PlayerId).Name("ID");
                Map(m => m.RANK).Name("RANK");
                Map(m => m.POS).Name("POS");
            }
        }

        private static CsvConfiguration GetIbwCsvConfig()
        {
            return new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim,
                Mode = CsvMode.RFC4180,
                AllowComments = true
            };
        }

        public static List<CsvPlayerRecord> ParseRankingsContent(string csvContent, int playerCount, RankingSource rankingSource)
        {
            using var reader = new StringReader(csvContent);
            var config = rankingSource == RankingSource.IBW 
                ? GetIbwCsvConfig()
                : new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    MissingFieldFound = null,
                    HeaderValidated = null
                };

            using var csv = new CsvReader(reader, config);
            if (rankingSource == RankingSource.IBW)
            {
                csv.Context.RegisterClassMap<IbwRankingsMap>();
            }
            else
            {
                csv.Context.RegisterClassMap<CsvPlayerRecordMap>();
            }
            
            var records = csv.GetRecords<CsvPlayerRecord>()
                .Where(r => !string.IsNullOrWhiteSpace(r.Name) && r.RANK.HasValue && r.RANK.Value > 0)
                .Take(playerCount)
                .ToList();

            // Validate no duplicate ranks
            var duplicateRanks = records.GroupBy(r => r.RANK)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateRanks.Any())
            {
                throw new InvalidOperationException($"Duplicate ranks found: {string.Join(", ", duplicateRanks)}");
            }

            return records;
        }

        public static List<CsvPlayerRecord> ParseCsvContent(string csvContent, int playerCount)
        {
            using var reader = new StringReader(csvContent);
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null
            };

            using var csv = new CsvReader(reader, config);
            csv.Context.RegisterClassMap<CsvPlayerRecordMap>();
            
            var records = csv.GetRecords<CsvPlayerRecord>()
                .Where(r => !string.IsNullOrWhiteSpace(r.Name))
                .Take(playerCount)
                .ToList();

            return records;
        }

        public static Player MapRankingsToPlayer(CsvPlayerRecord record, string dataSource, DateTime importDate, RankingSource rankingSource)
        {
            var player = new Player
            {
                Name = record.Name!,
                MLBTeam = record.Team,
                LastUpdated = importDate,
                ExternalIds = new Dictionary<string, string>(),
                Position = GetPosition(record, "rankings"),
                CreatedFrom = rankingSource,
                Rank = new Dictionary<RankingSource, int>
                {
                    [rankingSource] = record.RANK!.Value
                }
            };

            if (!string.IsNullOrWhiteSpace(record.PlayerId))
            {
                player.ExternalIds["fangraphs_id"] = record.PlayerId;
            }

            if (!string.IsNullOrWhiteSpace(record.MLBAMID))
            {
                player.ExternalIds["mlbam_id"] = record.MLBAMID;
            }

            return player;
        }

        public static Player MapToPlayer(CsvPlayerRecord record, string dataSource, string dataType, DateTime importDate, ProjectionType? projectionType)
        {
            var player = new Player
            {
                Name = record.Name!,
                MLBTeam = record.Team,
                LastUpdated = importDate,
                ExternalIds = new Dictionary<string, string>(),
                Position = GetPosition(record, dataType),
                CreatedFrom = null
            };

            if (!string.IsNullOrWhiteSpace(record.PlayerId))
            {
                player.ExternalIds["fangraphs_id"] = record.PlayerId;
            }

            if (!string.IsNullOrWhiteSpace(record.MLBAMID))
            {
                player.ExternalIds["mlbam_id"] = record.MLBAMID;
            }

            // Handle different import types
            if (dataType == "rankings" && record.RANK.HasValue)
            {
                player.Rank = new Dictionary<RankingSource, int>
                {
                    [RankingSource.IBW] = record.RANK.Value
                };
            }
            else if (dataType == "projections" && projectionType.HasValue)
            {
                var projectionData = new ProjectionData();

                if (projectionType == Models.Data.ProjectionType.Hitter)
                {
                    projectionData.Hitter = new ProjectionStats
                    {
                        UpdatedDate = importDate,
                        Stats = new Dictionary<string, double>()
                    };

                    // Hitter Stats
                    if (record.WAR.HasValue) projectionData.Hitter.Stats["war"] = record.WAR.Value;
                    if (record.G.HasValue) projectionData.Hitter.Stats["g"] = record.G.Value;
                    if (record.KPercent.HasValue) projectionData.Hitter.Stats["k%"] = record.KPercent.Value;
                    if (record.BBPercent.HasValue) projectionData.Hitter.Stats["bb%"] = record.BBPercent.Value;
                    if (record.SO.HasValue) projectionData.Hitter.Stats["so"] = record.SO.Value;
                    if (record.BB.HasValue) projectionData.Hitter.Stats["bb"] = record.BB.Value;
                    if (record.HR.HasValue) projectionData.Hitter.Stats["hr"] = record.HR.Value;
                    if (record.R.HasValue) projectionData.Hitter.Stats["r"] = record.R.Value;
                    if (record.RBI.HasValue) projectionData.Hitter.Stats["rbi"] = record.RBI.Value;
                    if (record.SB.HasValue) projectionData.Hitter.Stats["sb"] = record.SB.Value;
                    if (record.AVG.HasValue) projectionData.Hitter.Stats["avg"] = record.AVG.Value;
                    if (record.OPS.HasValue) projectionData.Hitter.Stats["ops"] = record.OPS.Value;
                    if (record.wRCPlus.HasValue) projectionData.Hitter.Stats["wrc+"] = record.wRCPlus.Value;
                    if (record.ISO.HasValue) projectionData.Hitter.Stats["iso"] = record.ISO.Value;
                }
                else if (projectionType == Models.Data.ProjectionType.Pitcher)
                {
                    projectionData.Pitcher = new ProjectionStats
                    {
                        UpdatedDate = importDate,
                        Stats = new Dictionary<string, double>()
                    };

                    // Pitcher Stats
                    if (record.WAR.HasValue) projectionData.Pitcher.Stats["war"] = record.WAR.Value;
                    if (record.G.HasValue) projectionData.Pitcher.Stats["g"] = record.G.Value;
                    if (record.IP.HasValue) projectionData.Pitcher.Stats["ip"] = record.IP.Value;
                    if (record.ERA.HasValue) projectionData.Pitcher.Stats["era"] = record.ERA.Value;
                    if (record.WHIP.HasValue) projectionData.Pitcher.Stats["whip"] = record.WHIP.Value;
                    if (record.GS.HasValue) projectionData.Pitcher.Stats["gs"] = record.GS.Value;
                    if (record.SV.HasValue) projectionData.Pitcher.Stats["sv"] = record.SV.Value;
                    if (record.QS.HasValue) projectionData.Pitcher.Stats["qs"] = record.QS.Value;
                    if (record.GBPercent.HasValue) projectionData.Pitcher.Stats["gb%"] = record.GBPercent.Value;
                    if (record.KPer9.HasValue) projectionData.Pitcher.Stats["k/9"] = record.KPer9.Value;
                    if (record.BBPer9.HasValue) projectionData.Pitcher.Stats["bb/9"] = record.BBPer9.Value;
                    if (record.HRPer9.HasValue) projectionData.Pitcher.Stats["hr/9"] = record.HRPer9.Value;
                    if (record.SO.HasValue) projectionData.Pitcher.Stats["so"] = record.SO.Value;
                    if (record.BB.HasValue) projectionData.Pitcher.Stats["bb"] = record.BB.Value;
                    if (record.HR.HasValue) projectionData.Pitcher.Stats["hr"] = record.HR.Value;
                }

                player.Projections = new Dictionary<string, ProjectionData>
                {
                    [dataSource] = projectionData
                };
            }

            return player;
        }

        private static string[] GetPosition(CsvPlayerRecord record, string dataType)
        {
            if (!string.IsNullOrWhiteSpace(record.POS))
            {
                return record.POS.Split('/');
            }
            
            // For projections, infer position from stats
            if (dataType == "projections")
            {
                return record.IP.HasValue && record.IP.Value > 0 ? new[] { "P" } : Array.Empty<string>();
            }

            return Array.Empty<string>();
        }
    }
}
