using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace DraftEngine.Models.Data
{
    /// <summary>
    /// Request model for CSV file import
    /// </summary>
    public class CsvImportRequest
    {
        /// <summary>
        /// The CSV file containing player data
        /// </summary>
        [Required]
        public IFormFile File { get; set; } = null!;

        /// <summary>
        /// Type of projections being imported (required when DataType is "projections")
        /// </summary>
        public ProjectionType? ProjectionType { get; set; }

        /// <summary>
        /// The source of the data for projections
        /// </summary>
        public ProjectionSource? ProjectionSource { get; set; }

        /// <summary>
        /// The source of the data for rankings
        /// </summary>
        public RankingSource? RankingSource { get; set; }

        /// <summary>
        /// The source of the data for prospects
        /// </summary>
        public ProspectSource? ProspectSource { get; set; }

        /// <summary>
        /// Type of data: projections, rankings, or prospects
        /// </summary>
        [Required]
        public string DataType { get; set; } = null!;

        /// <summary>
        /// The source of the data (maintained for backward compatibility)
        /// </summary>
        [Required]
        public string DataSource { get; set; } = null!;

        /// <summary>
        /// Number of players to import from the CSV
        /// </summary>
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Player count must be greater than 0")]
        public int PlayerCount { get; set; }
    }
}
