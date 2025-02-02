namespace DraftEngine.Models.Data
{
    public class ApiResponse<T>
    {
        public T? Value { get; set; }
        public int Count { get; set; }
        public string? Error { get; set; }

        public ApiResponse(T? value, int count = 0, string? error = null)
        {
            Value = value;
            Count = count;
            Error = error;
        }

        public static ApiResponse<T> Create(T? value, string? error = null)
        {
            var count = value switch
            {
                System.Collections.ICollection collection => collection.Count,
                System.Collections.IEnumerable enumerable => enumerable.Cast<object>().Count(),
                _ => 1
            };

            return new ApiResponse<T>(value, count, error);
        }
    }
}
