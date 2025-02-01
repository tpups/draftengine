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
        /// The source of the data (e.g., steamer_2025)
        /// </summary>
        [Required]
        public string DataSource { get; set; } = null!;

        /// <summary>
        /// Type of data: projections, rankings, or prospects
        /// </summary>
        [Required]
        public string DataType { get; set; } = null!;

        /// <summary>
        /// Number of players to import from the CSV
        /// </summary>
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Player count must be greater than 0")]
        public int PlayerCount { get; set; }
    }
}
