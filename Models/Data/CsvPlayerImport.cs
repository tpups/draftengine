using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;

namespace DraftEngine.Models.Data
{
    public class CsvPlayerImport
    {
        public string DataSource { get; set; } = null!;
        public DateTime ImportDate { get; set; }
        public string DataType { get; set; } = null!; // "projections", "rankings", "prospects"
        public int PlayerCount { get; set; }

        public class CsvPlayerRecord
        {
            public string? Name { get; set; }
            public string? Team { get; set; }
            public string? PlayerId { get; set; }  // FanGraphs ID
            public string? MLBAMID { get; set; }
            
            // Hitter Projections
            public double? HR { get; set; }
            public double? R { get; set; }
            public double? RBI { get; set; }
            public double? SB { get; set; }
            public double? AVG { get; set; }
            public double? OPS { get; set; }
            public double? wRCPlus { get; set; }  // wRC+
            public double? WAR { get; set; }
            public double? G { get; set; }
            public double? KPercent { get; set; }  // K%
            public double? BBPercent { get; set; }  // BB%

            // Pitcher Projections
            public double? IP { get; set; }
            public double? SV { get; set; }
            public double? QS { get; set; }
            public double? ERA { get; set; }
            public double? WHIP { get; set; }
            public double? GS { get; set; }
            public double? K { get; set; }
            public double? BB { get; set; }
            public double? H { get; set; }
            public double? HRA { get; set; }  // HR allowed
            public double? KKPercent { get; set; }  // K%
            public double? BBBPercent { get; set; }  // BB%
        }

        public class CsvPlayerRecordMap : ClassMap<CsvPlayerRecord>
        {
            public CsvPlayerRecordMap()
            {
                Map(m => m.Name).Name("Name");
                Map(m => m.Team).Name("Team");
                Map(m => m.PlayerId).Name("PlayerId");
                Map(m => m.MLBAMID).Name("MLBAMID");
                
                // Hitter Projections
                Map(m => m.HR).Name("HR");
                Map(m => m.R).Name("R");
                Map(m => m.RBI).Name("RBI");
                Map(m => m.SB).Name("SB");
                Map(m => m.AVG).Name("AVG");
                Map(m => m.OPS).Name("OPS");
                Map(m => m.wRCPlus).Name("wRC+");
                Map(m => m.WAR).Name("WAR");
                Map(m => m.G).Name("G");
                Map(m => m.KPercent).Name("K%");
                Map(m => m.BBPercent).Name("BB%");

                // Pitcher Projections
                Map(m => m.IP).Name("IP");
                Map(m => m.SV).Name("SV");
                Map(m => m.QS).Name("QS");
                Map(m => m.ERA).Name("ERA");
                Map(m => m.WHIP).Name("WHIP");
                Map(m => m.GS).Name("GS");
                Map(m => m.K).Name("K");
                Map(m => m.BB).Name("BB");
                Map(m => m.H).Name("H");
                Map(m => m.HRA).Name("HR");
                Map(m => m.KKPercent).Name("K%");
                Map(m => m.BBBPercent).Name("BB%");
            }
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

        public static Player MapToPlayer(CsvPlayerRecord record, string dataSource, string dataType, DateTime importDate)
        {
            var player = new Player
            {
                Name = record.Name!,
                MLBTeam = record.Team,
                LastUpdated = importDate,
                ExternalIds = new Dictionary<string, string>()
            };

            if (!string.IsNullOrWhiteSpace(record.PlayerId))
            {
                player.ExternalIds["fangraphs_id"] = record.PlayerId;
            }

            if (!string.IsNullOrWhiteSpace(record.MLBAMID))
            {
                player.ExternalIds["mlbam_id"] = record.MLBAMID;
            }

            // Handle projections
            if (dataType == "projections")
            {
                var projectionData = new ProjectionData
                {
                    UpdatedDate = importDate,
                    Stats = new Dictionary<string, double>()
                };

                // Map available stats based on non-null values
                if (record.HR.HasValue) projectionData.Stats["HR"] = record.HR.Value;
                if (record.R.HasValue) projectionData.Stats["R"] = record.R.Value;
                if (record.RBI.HasValue) projectionData.Stats["RBI"] = record.RBI.Value;
                if (record.SB.HasValue) projectionData.Stats["SB"] = record.SB.Value;
                if (record.AVG.HasValue) projectionData.Stats["AVG"] = record.AVG.Value;
                if (record.OPS.HasValue) projectionData.Stats["OPS"] = record.OPS.Value;
                if (record.wRCPlus.HasValue) projectionData.Stats["wRC+"] = record.wRCPlus.Value;
                if (record.WAR.HasValue) projectionData.Stats["WAR"] = record.WAR.Value;
                if (record.G.HasValue) projectionData.Stats["G"] = record.G.Value;
                if (record.KPercent.HasValue) projectionData.Stats["K%"] = record.KPercent.Value;
                if (record.BBPercent.HasValue) projectionData.Stats["BB%"] = record.BBPercent.Value;

                if (record.IP.HasValue) projectionData.Stats["IP"] = record.IP.Value;
                if (record.SV.HasValue) projectionData.Stats["SV"] = record.SV.Value;
                if (record.QS.HasValue) projectionData.Stats["QS"] = record.QS.Value;
                if (record.ERA.HasValue) projectionData.Stats["ERA"] = record.ERA.Value;
                if (record.WHIP.HasValue) projectionData.Stats["WHIP"] = record.WHIP.Value;
                if (record.GS.HasValue) projectionData.Stats["GS"] = record.GS.Value;
                if (record.K.HasValue) projectionData.Stats["K"] = record.K.Value;
                if (record.BB.HasValue) projectionData.Stats["BB"] = record.BB.Value;
                if (record.H.HasValue) projectionData.Stats["H"] = record.H.Value;
                if (record.HRA.HasValue) projectionData.Stats["HR"] = record.HRA.Value;
                if (record.KKPercent.HasValue) projectionData.Stats["K%"] = record.KKPercent.Value;
                if (record.BBBPercent.HasValue) projectionData.Stats["BB%"] = record.BBBPercent.Value;

                player.Projections = new Dictionary<string, ProjectionData>
                {
                    [dataSource] = projectionData
                };
            }

            return player;
        }
    }
}
