namespace DraftEngine.Models.Data
{
    /// <summary>
    /// Represents a paginated result set with metadata about the pagination
    /// </summary>
    /// <typeparam name="T">The type of items in the result set</typeparam>
    public class PaginatedResult<T>
    {
        /// <summary>
        /// The items in the current page
        /// </summary>
        public List<T> Items { get; set; } = new();

        /// <summary>
        /// The total number of items across all pages
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// The current page number (1-based)
        /// </summary>
        public int CurrentPage { get; set; }

        /// <summary>
        /// The number of items per page
        /// </summary>
        public int PageSize { get; set; }

        /// <summary>
        /// The total number of pages
        /// </summary>
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);

        /// <summary>
        /// Whether there is a previous page available
        /// </summary>
        public bool HasPreviousPage => CurrentPage > 1;

        /// <summary>
        /// Whether there is a next page available
        /// </summary>
        public bool HasNextPage => CurrentPage < TotalPages;
    }
}
